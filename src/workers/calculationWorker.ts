import { calculatePortfolioGrowth } from '../utils/calculations';
import type { PortfolioGrowthOptions, PortfolioResults } from '../types';

export interface CalcWorkerRequest {
  type: 'calculate';
  options: PortfolioGrowthOptions;
}

export interface CalcWorkerResponse {
  type: 'result';
  results: PortfolioResults;
}

export interface CalcWorkerError {
  type: 'error';
  message: string;
}

self.onmessage = (event: MessageEvent<CalcWorkerRequest>) => {
  const { type, options } = event.data;
  if (type === 'calculate') {
    try {
      // Reconstruct Date object (lost during structured clone)
      if (options.dateOfBirth && typeof options.dateOfBirth === 'string') {
        options.dateOfBirth = new Date(options.dateOfBirth as unknown as string);
      }
      const results = calculatePortfolioGrowth(options);
      self.postMessage({ type: 'result', results } satisfies CalcWorkerResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      self.postMessage({ type: 'error', message } satisfies CalcWorkerError);
    }
  }
};
