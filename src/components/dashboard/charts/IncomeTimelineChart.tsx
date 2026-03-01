import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { getBaseOptions } from './chartConfig';
import type { PhaseBandsOptions } from './phaseBandsPlugin';
import { useExternalTooltip } from './useExternalTooltip';
import { useSlicedChartData } from './useSlicedChartData';
import { getCssColor } from './chartTheme';
import { useThemeKey } from '@/hooks/useThemeKey';
import type { CombinedYearData } from '@/utils/calculations';

interface IncomeTimelineChartProps {
  data: ChartData<'line'>;
  combined: CombinedYearData[];
  phaseBands: PhaseBandsOptions;
  isFirstYearProRated: boolean;
  proRatedMonths?: number;
  ageRange?: [number, number];
}

export function IncomeTimelineChart({
  data,
  combined,
  phaseBands,
  isFirstYearProRated,
  proRatedMonths,
  ageRange,
}: IncomeTimelineChartProps) {
  const themeKey = useThemeKey();
  const muted = getCssColor('--muted-foreground');

  const { slicedData, slicedCombined, slicedPhaseBands } = useSlicedChartData({ data, combined, phaseBands, ageRange });

  const tooltipHandler = useExternalTooltip({ combined: slicedCombined, isFirstYearProRated, proRatedMonths, showPercentages: false });

  const options = useMemo<ChartOptions<'line'>>(() => {
    const base = getBaseOptions();
    return {
      ...base,
      scales: {
        ...base.scales,
        y: {
          ...base.scales?.y,
          position: 'left' as const,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Net Income',
            color: muted,
            font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          },
        },
        x: { ...base.scales?.x },
      },
      plugins: {
        ...base.plugins,
        tooltip: { enabled: false, external: tooltipHandler },
      },
      phaseBands: slicedPhaseBands,
    } as any;
  }, [tooltipHandler, slicedPhaseBands, muted, themeKey]);

  return (
    <div className="relative h-[280px] sm:h-[340px] lg:h-[380px] xl:h-[420px] w-full" role="img" aria-label="Income timeline chart showing net income projections over time">
      <Line data={slicedData} options={options} />
    </div>
  );
}
