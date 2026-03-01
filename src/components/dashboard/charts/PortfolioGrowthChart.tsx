import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { getBaseOptions } from './chartConfig';
import type { PhaseBandsOptions } from './phaseBandsPlugin';
import { useExternalTooltip } from './useExternalTooltip';
import { useSlicedChartData } from './useSlicedChartData';
import { useThemeKey } from '@/hooks/useThemeKey';
import type { CombinedYearData } from '@/utils/calculations';

interface PortfolioGrowthChartProps {
  data: ChartData<'line'>;
  combined: CombinedYearData[];
  phaseBands: PhaseBandsOptions;
  isFirstYearProRated: boolean;
  proRatedMonths?: number;
  ageRange?: [number, number];
}

export function PortfolioGrowthChart({
  data,
  combined,
  phaseBands,
  isFirstYearProRated,
  proRatedMonths,
  ageRange,
}: PortfolioGrowthChartProps) {
  const themeKey = useThemeKey();

  const { slicedData, slicedCombined, slicedPhaseBands } = useSlicedChartData({ data, combined, phaseBands, ageRange });

  const tooltipHandler = useExternalTooltip({ combined: slicedCombined, isFirstYearProRated, proRatedMonths });

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
    <div className="relative h-[280px] sm:h-[340px] lg:h-[380px] xl:h-[420px] w-full" role="img" aria-label="Portfolio growth chart showing balance projections over time by account">
      <Line data={slicedData} options={options} />
    </div>
  );
}
