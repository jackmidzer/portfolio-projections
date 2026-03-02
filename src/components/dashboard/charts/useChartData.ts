import { useMemo } from 'react';
import type { ChartData } from 'chart.js';
import type { AccountType, PortfolioResults } from '@/types';
import { combineYearlyData } from '@/utils/calculations';
import { deflate } from '@/utils/formatters';
import {
  getAccountColor,
  getPrincipalColor,
  getInterestColor,
} from './chartTheme';
import type { PhaseBandsOptions } from './phaseBandsPlugin';
import { useThemeKey } from '@/hooks/useThemeKey';
import type { MonteCarloPercentiles } from '@/store/useProjectionStore';

interface UseChartDataOptions {
  showRealValues?: boolean;
  inflationRate?: number;
  currentAge?: number;
  monteCarloPercentiles?: MonteCarloPercentiles | null;
}

/**
 * Central hook that transforms PortfolioResults into memoised Chart.js datasets
 * for all four chart views, plus shared milestone annotations and phase config.
 */
export function useChartData(results: PortfolioResults, options?: UseChartDataOptions) {
  const { showRealValues = false, inflationRate = 2.5, currentAge = 28, monteCarloPercentiles = null } = options ?? {};
  // Re-compute colors when dark/light mode changes
  const themeKey = useThemeKey();

  // Combined data (O(n) optimised)
  const combined = useMemo(
    () => combineYearlyData(results.accountResults, results.fireAge, results.pensionAge, results.taxInputs),
    [results],
  );

  const ages = useMemo(() => combined.map((d) => d.age), [combined]);

  // Helper to optionally deflate a value
  const adj = (value: number, age: number) =>
    showRealValues ? deflate(value, age - currentAge, inflationRate) : value;

  // Phase bands config (shared by all charts)
  const phaseBands: PhaseBandsOptions = useMemo(
    () => ({
      fireAge: results.fireAge,
      pensionAge: results.pensionAge,
      ages,
    }),
    [results.fireAge, results.pensionAge, ages],
  );

  // ── 1. Portfolio Growth (stacked area) ──────────────────────────────────────
  const portfolioGrowthData: ChartData<'line'> = useMemo(
    () => ({
      labels: ages,
      datasets: [
        {
          label: 'Savings',
          data: combined.map((d) => adj(d.Savings, d.age)),
          borderColor: getAccountColor('Savings'),
          backgroundColor: getAccountColor('Savings', 0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 1,
        },
        {
          label: 'Pension',
          data: combined.map((d) => adj(d.Pension, d.age)),
          borderColor: getAccountColor('Pension'),
          backgroundColor: getAccountColor('Pension', 0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 3,
        },
        {
          label: 'Brokerage',
          data: combined.map((d) => adj(d.Brokerage, d.age)),
          borderColor: getAccountColor('Brokerage'),
          backgroundColor: getAccountColor('Brokerage', 0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 2,
        },
        {
          label: 'Total',
          data: combined.map((d) => adj(d.Savings + d.Pension + d.Brokerage, d.age)),
          borderColor: 'hsl(220, 14%, 45%)',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderDash: [5, 3],
          borderWidth: 2,
          order: 0,
          stack: 'total',
          isTotalLine: true,
        } as any,
      ],
    }),
    [combined, ages, themeKey, showRealValues, inflationRate, currentAge],
  );

  // ── 1b. Monte Carlo chart (standalone) ──────────────────────────────────────
  const monteCarloChartData: ChartData<'line'> | null = useMemo(() => {
    if (!monteCarloPercentiles) return null;
    const { p10, p25, p50, p75, p90, ages: mcAges } = monteCarloPercentiles;
    const mcByAge = new Map<number, { p10: number; p25: number; p50: number; p75: number; p90: number }>();
    for (let i = 0; i < mcAges.length; i++) {
      mcByAge.set(mcAges[i], { p10: p10[i], p25: p25[i], p50: p50[i], p75: p75[i], p90: p90[i] });
    }
    const p10Data = ages.map((a) => { const d = mcByAge.get(a); return d ? adj(d.p10, a) : null; });
    const p25Data = ages.map((a) => { const d = mcByAge.get(a); return d ? adj(d.p25, a) : null; });
    const p50Data = ages.map((a) => { const d = mcByAge.get(a); return d ? adj(d.p50, a) : null; });
    const p75Data = ages.map((a) => { const d = mcByAge.get(a); return d ? adj(d.p75, a) : null; });
    const p90Data = ages.map((a) => { const d = mcByAge.get(a); return d ? adj(d.p90, a) : null; });
    // Also include the deterministic total for reference
    const totalData = combined.map((d) => adj(d.Savings + d.Pension + d.Brokerage, d.age));

    return {
      labels: ages,
      datasets: [
        {
          label: '90th Percentile',
          data: p90Data,
          borderColor: 'hsla(260, 60%, 55%, 0.5)',
          backgroundColor: 'hsla(260, 60%, 55%, 0.06)',
          fill: '+4', // fill down to P10 (skip P75, P50, P25)
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 1.5,
          borderDash: [4, 2],
          order: 4,
        },
        {
          label: '75th Percentile',
          data: p75Data,
          borderColor: 'hsla(260, 60%, 55%, 0.35)',
          backgroundColor: 'hsla(260, 60%, 55%, 0.10)',
          fill: '+2', // fill down to P25 (skip P50)
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 1,
          borderDash: [2, 2],
          order: 3,
        },
        {
          label: 'Median (P50)',
          data: p50Data,
          borderColor: 'hsl(260, 60%, 55%)',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 2.5,
          order: 0,
        },
        {
          label: '25th Percentile',
          data: p25Data,
          borderColor: 'hsla(260, 60%, 55%, 0.35)',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 1,
          borderDash: [2, 2],
          order: 2,
        },
        {
          label: '10th Percentile',
          data: p10Data,
          borderColor: 'hsla(260, 60%, 55%, 0.5)',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 1.5,
          borderDash: [4, 2],
          order: 5,
        },
        {
          label: 'Deterministic',
          data: totalData,
          borderColor: 'hsl(220, 14%, 55%)',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 1.5,
          borderDash: [6, 4],
          order: 1,
        },
      ],
    };
  }, [monteCarloPercentiles, combined, ages, showRealValues, inflationRate, currentAge]);

  // ── 2. Contributions vs Growth (stacked area) ───────────────────────────────
  const contributionsGrowthData: ChartData<'line'> = useMemo(
    () => ({
      labels: ages,
      datasets: [
        {
          label: 'Deposits (Principal)',
          data: combined.map((d) => adj(d.Principal, d.age)),
          borderColor: getPrincipalColor(),
          backgroundColor: getPrincipalColor(0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 1,
        },
        {
          label: 'Growth (Interest)',
          data: combined.map((d) => adj(d.Interest, d.age)),
          borderColor: getInterestColor(),
          backgroundColor: getInterestColor(0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 2,
        },
      ],
    }),
    [combined, ages, themeKey, showRealValues, inflationRate, currentAge],
  );

  // ── 3. Annual Flows (bar chart) ─────────────────────────────────────────────
  const annualFlowsData: ChartData<'bar'> = useMemo(
    () => ({
      labels: ages,
      datasets: [
        {
          label: 'Contributions',
          data: combined.map((d) => adj(d.yearContributions, d.age)),
          backgroundColor: getAccountColor('Pension', 0.7),
          borderColor: getAccountColor('Pension'),
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: 'Interest Earned',
          data: combined.map((d) => adj(d.yearInterest, d.age)),
          backgroundColor: getInterestColor(0.7),
          borderColor: getInterestColor(),
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: 'Withdrawals',
          data: combined.map((d) => (d.yearWithdrawals > 0 ? -adj(d.yearWithdrawals, d.age) : 0)),
          backgroundColor: 'hsla(0, 72%, 51%, 0.6)',
          borderColor: 'hsl(0, 72%, 51%)',
          borderWidth: 1,
          borderRadius: 2,
        },
      ],
    }),
    [combined, ages, themeKey, showRealValues, inflationRate, currentAge],
  );

  // ── 3a. Deposits vs Growth — per-account view ─────────────────────────────
  const perAccountContributionsGrowthData = useMemo(() => {
    const map: Partial<Record<AccountType, ChartData<'line'>>> = {};
    for (const acct of results.accountResults) {
      const labels: number[] = [];
      const principalData: number[] = [];
      const interestData: number[] = [];
      let cumPrincipal = 0;
      let cumInterest = 0;
      for (const yr of acct.yearlyData) {
        labels.push(yr.age);
        cumPrincipal += yr.contributions;
        cumInterest += yr.interestEarned;
        principalData.push(adj(cumPrincipal, yr.age));
        interestData.push(adj(cumInterest, yr.age));
      }
      map[acct.accountName] = {
        labels,
        datasets: [
          {
            label: 'Deposits (Principal)',
            data: principalData,
            borderColor: getPrincipalColor(),
            backgroundColor: getPrincipalColor(0.35),
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            order: 1,
          },
          {
            label: 'Growth (Interest)',
            data: interestData,
            borderColor: getInterestColor(),
            backgroundColor: getInterestColor(0.35),
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            order: 2,
          },
        ],
      };
    }
    return map;
  }, [results, themeKey, showRealValues, inflationRate, currentAge]);

  // ── 3b. Annual Flows — per-account view ────────────────────────────────────
  const perAccountAnnualFlowsData = useMemo(() => {
    const map: Partial<Record<AccountType, ChartData<'bar'>>> = {};
    for (const acct of results.accountResults) {
      const labels: number[] = [];
      const contributionsData: number[] = [];
      const interestData: number[] = [];
      const withdrawalsData: number[] = [];
      for (const yr of acct.yearlyData) {
        labels.push(yr.age);
        contributionsData.push(adj(yr.contributions, yr.age));
        interestData.push(adj(yr.interestEarned, yr.age));
        withdrawalsData.push(yr.withdrawal > 0 ? -adj(yr.withdrawal, yr.age) : 0);
      }
      map[acct.accountName] = {
        labels,
        datasets: [
          {
            label: 'Contributions',
            data: contributionsData,
            backgroundColor: getAccountColor('Pension', 0.7),
            borderColor: getAccountColor('Pension'),
            borderWidth: 1,
            borderRadius: 2,
          },
          {
            label: 'Interest Earned',
            data: interestData,
            backgroundColor: getInterestColor(0.7),
            borderColor: getInterestColor(),
            borderWidth: 1,
            borderRadius: 2,
          },
          {
            label: 'Withdrawals',
            data: withdrawalsData,
            backgroundColor: 'hsla(0, 72%, 51%, 0.6)',
            borderColor: 'hsl(0, 72%, 51%)',
            borderWidth: 1,
            borderRadius: 2,
          },
        ],
      };
    }
    return map;
  }, [results, themeKey, showRealValues, inflationRate, currentAge]);

  // ── 4. Income Timeline (line chart) ─────────────────────────────────────────
  const incomeTimelineData: ChartData<'line'> = useMemo(() => {
    return {
      labels: ages,
      datasets: [
        {
          label: 'Net Income',
          data: combined.map((d) => adj(d.netIncome, d.age)),
          borderColor: getAccountColor('Pension'),
          backgroundColor: getAccountColor('Pension', 0.15),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 2,
        },
      ],
    };
  }, [combined, ages, themeKey, showRealValues, inflationRate, currentAge]);

  return {
    combined,
    ages,
    phaseBands,
    portfolioGrowthData,
    monteCarloChartData,
    contributionsGrowthData,
    annualFlowsData,
    incomeTimelineData,
    perAccountContributionsGrowthData,
    perAccountAnnualFlowsData,
  };
}
