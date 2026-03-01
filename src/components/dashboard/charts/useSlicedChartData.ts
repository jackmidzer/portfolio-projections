import { useMemo } from 'react';
import type { ChartData } from 'chart.js';
import type { PhaseBandsOptions } from './phaseBandsPlugin';
import type { CombinedYearData } from '@/utils/calculations';

interface SlicedChartDataInput<T extends 'line' | 'bar' = 'line'> {
  data: ChartData<T>;
  combined: CombinedYearData[];
  phaseBands: PhaseBandsOptions;
  ageRange?: [number, number];
}

/**
 * Slices chart data, combined year data, and phase bands to the visible age range.
 * Shared across all chart components to eliminate duplication.
 */
export function useSlicedChartData<T extends 'line' | 'bar' = 'line'>({
  data,
  combined,
  phaseBands,
  ageRange,
}: SlicedChartDataInput<T>) {
  return useMemo(() => {
    if (!ageRange) return { slicedData: data, slicedCombined: combined, slicedPhaseBands: phaseBands };
    const ages = phaseBands.ages;
    const startIdx = ages.findIndex((a) => a >= ageRange[0]);
    const endIdx = ages.findIndex((a) => a > ageRange[1]);
    const si = startIdx >= 0 ? startIdx : 0;
    const ei = endIdx >= 0 ? endIdx : ages.length;
    return {
      slicedData: {
        labels: (data.labels as number[]).slice(si, ei),
        datasets: data.datasets.map((ds) => ({ ...ds, data: (ds.data as number[]).slice(si, ei) })),
      } as ChartData<T>,
      slicedCombined: combined.slice(si, ei),
      slicedPhaseBands: { ...phaseBands, ages: ages.slice(si, ei) },
    };
  }, [data, combined, phaseBands, ageRange]);
}
