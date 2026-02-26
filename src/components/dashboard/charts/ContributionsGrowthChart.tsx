import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { getBaseOptions } from './chartConfig';
import { phaseBandsPlugin, type PhaseBandsOptions } from './phaseBandsPlugin';
import { useExternalTooltip } from './useExternalTooltip';
import { useThemeKey } from '@/hooks/useThemeKey';
import type { CombinedYearData } from '@/utils/calculations';

import { Chart as ChartJS } from 'chart.js';
ChartJS.register(phaseBandsPlugin);

interface ContributionsGrowthChartProps {
  data: ChartData<'line'>;
  combined: CombinedYearData[];
  phaseBands: PhaseBandsOptions;
  isFirstYearProRated: boolean;
  ageRange?: [number, number];
}

export function ContributionsGrowthChart({
  data,
  combined,
  phaseBands,
  isFirstYearProRated,
  ageRange,
}: ContributionsGrowthChartProps) {
  const themeKey = useThemeKey();

  const { slicedData, slicedCombined, slicedPhaseBands } = useMemo(() => {
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
      } as ChartData<'line'>,
      slicedCombined: combined.slice(si, ei),
      slicedPhaseBands: { ...phaseBands, ages: ages.slice(si, ei) },
    };
  }, [data, combined, phaseBands, ageRange]);

  const tooltipHandler = useExternalTooltip({ combined: slicedCombined, isFirstYearProRated });

  const options = useMemo<ChartOptions<'line'>>(() => {
    const base = getBaseOptions();
    return {
      ...base,
      scales: {
        ...base.scales,
        y: { ...base.scales?.y, stacked: true, beginAtZero: true },
        x: { ...base.scales?.x },
      },
      plugins: {
        ...base.plugins,
        tooltip: { enabled: false, external: tooltipHandler },
      },
      phaseBands: slicedPhaseBands,
    } as any;
  }, [tooltipHandler, slicedPhaseBands, themeKey]);

  return (
    <div className="relative h-[380px] w-full">
      <Line data={slicedData} options={options} />
    </div>
  );
}
