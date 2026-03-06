import { runMonteCarloSimulation } from '../utils/mcCalculations';
import type { PortfolioGrowthOptions } from '../types';

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
  samplePaths: number[][];
  sampleIncomePaths: number[][];
  /** Fraction (0–1) of simulations that ended with a positive total balance */
  successRate: number;
  /** Raw count of simulations that ended with a positive total balance */
  successCount: number;
}

export interface MCWorkerError {
  type: 'error';
  message: string;
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

    const result = runMonteCarloSimulation(baseOptions, simulations, returnVolatility);

    self.postMessage({
      type: 'result',
      percentiles: result.percentiles,
      incomePercentiles: result.incomePercentiles,
      samplePaths: result.samplePaths,
      sampleIncomePaths: result.sampleIncomePaths,
      successRate: result.successRate,
      successCount: result.successCount,
    } satisfies MCWorkerResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', message } satisfies MCWorkerError);
  }
};
