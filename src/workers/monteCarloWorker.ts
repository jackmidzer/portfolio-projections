import { calculatePortfolioGrowth, combineYearlyData } from '../utils/calculations';
import type { PortfolioGrowthOptions, AccountInput } from '../types';

// ─── Types ──────────────────────────────────────────────────────────

export interface MCWorkerRequest {
  type: 'run';
  baseOptions: PortfolioGrowthOptions;
  simulations: number;
  returnVolatility: number;
}

export interface MCWorkerResponse {
  type: 'result';
  percentiles: {
    p10: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p90: number[];
    ages: number[];
  };
  incomePercentiles: {
    p10: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p90: number[];
    ages: number[];
  };
}

export interface MCWorkerError {
  type: 'error';
  message: string;
}

// ─── Box-Muller transform ───────────────────────────────────────────

function boxMullerRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random(); // avoid log(0)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Sample a per-year return from a normal distribution.
 * mean and stdDev are in percentage points (e.g. 7 and 8).
 */
function sampleReturn(mean: number, stdDev: number): number {
  return mean + stdDev * boxMullerRandom();
}

// ─── Worker handler ─────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<MCWorkerRequest>) => {
  const { type, baseOptions, simulations, returnVolatility } = event.data;
  if (type !== 'run') return;

  try {
    // Reconstruct Date object (lost during structured clone)
    if (baseOptions.dateOfBirth && typeof baseOptions.dateOfBirth === 'string') {
      baseOptions.dateOfBirth = new Date(baseOptions.dateOfBirth as unknown as string);
    }

    // Run one deterministic pass first to get the age labels
    const baseline = calculatePortfolioGrowth(baseOptions);
    const numYears = baseline.accountResults[0]?.yearlyData.length ?? 0;
    const ages = baseline.accountResults[0]?.yearlyData.map((y) => y.age) ?? [];

    // Collect total ending balances and net income per simulation per year
    const allTotals: number[][] = []; // [sim][year]
    const allIncomes: number[][] = []; // [sim][year]

    for (let sim = 0; sim < simulations; sim++) {
      // For each simulation, create a copy of accounts with randomised returns
      // All accounts share the same per-year random shock to keep correlation realistic
      const yearShocks: number[] = [];
      for (let y = 0; y < numYears; y++) {
        yearShocks.push(boxMullerRandom());
      }

      // Create accounts with randomised expected returns per year
      // We approximate by sampling one effective annual return per account per year.
      // Since calculatePortfolioGrowth uses a fixed expectedReturn, we sample a
      // single effective return for this entire run per account and set it on the account.
      // This is the "simple" approach — a single draw per simulation from the return distribution.
      const randomAccounts: AccountInput[] = baseOptions.accounts.map((acct) => ({
        ...acct,
        expectedReturn: sampleReturn(acct.expectedReturn, returnVolatility),
      }));

      const simOptions: PortfolioGrowthOptions = {
        ...baseOptions,
        accounts: randomAccounts,
      };

      const simResult = calculatePortfolioGrowth(simOptions);

      // Sum total portfolio balance per year
      const yearTotals: number[] = new Array(numYears).fill(0);
      for (const acctResult of simResult.accountResults) {
        for (let y = 0; y < acctResult.yearlyData.length; y++) {
          yearTotals[y] += acctResult.yearlyData[y].endingBalance;
        }
      }
      allTotals.push(yearTotals);

      // Compute net income per year via combineYearlyData
      const combined = combineYearlyData(
        simResult.accountResults,
        simOptions.fireAge ?? 99,
        simOptions.pensionAge ?? 66,
        simOptions.taxInputs,
      );
      allIncomes.push(combined.map((d) => d.netIncome));
    }

    // Compute percentiles per year
    const p10: number[] = [];
    const p25: number[] = [];
    const p50: number[] = [];
    const p75: number[] = [];
    const p90: number[] = [];

    const incP10: number[] = [];
    const incP25: number[] = [];
    const incP50: number[] = [];
    const incP75: number[] = [];
    const incP90: number[] = [];

    for (let y = 0; y < numYears; y++) {
      const values = allTotals.map((sim) => sim[y]).sort((a, b) => a - b);
      p10.push(percentile(values, 10));
      p25.push(percentile(values, 25));
      p50.push(percentile(values, 50));
      p75.push(percentile(values, 75));
      p90.push(percentile(values, 90));

      const incValues = allIncomes.map((sim) => sim[y]).sort((a, b) => a - b);
      incP10.push(percentile(incValues, 10));
      incP25.push(percentile(incValues, 25));
      incP50.push(percentile(incValues, 50));
      incP75.push(percentile(incValues, 75));
      incP90.push(percentile(incValues, 90));
    }

    self.postMessage({
      type: 'result',
      percentiles: { p10, p25, p50, p75, p90, ages },
      incomePercentiles: { p10: incP10, p25: incP25, p50: incP50, p75: incP75, p90: incP90, ages },
    } satisfies MCWorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', message } satisfies MCWorkerError);
  }
};

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}
