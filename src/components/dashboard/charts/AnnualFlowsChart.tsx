import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import type { PhaseBandsOptions } from './phaseBandsPlugin';
import { useExternalTooltip } from './useExternalTooltip';
import { formatCompactCurrency } from '@/utils/formatters';
import { getCssColor } from './chartTheme';
import { getAnimationDuration } from './chartConfig';
import { useThemeKey } from '@/hooks/useThemeKey';
import { useSlicedChartData } from './useSlicedChartData';
import type { CombinedYearData } from '@/utils/calculations';

interface AnnualFlowsChartProps {
  data: ChartData<'bar'>;
  combined: CombinedYearData[];
  phaseBands: PhaseBandsOptions;
  isFirstYearProRated: boolean;
  proRatedMonths?: number;
  ageRange?: [number, number];
}

export function AnnualFlowsChart({
  data,
  combined,
  phaseBands,
  isFirstYearProRated,
  proRatedMonths,
  ageRange,
}: AnnualFlowsChartProps) {
  const themeKey = useThemeKey();
  const muted = getCssColor('--muted-foreground');
  const border = getCssColor('--border');

  const { slicedData, slicedCombined, slicedPhaseBands } = useSlicedChartData<'bar'>({
    data,
    combined,
    phaseBands,
    ageRange,
  });

  const tooltipHandler = useExternalTooltip({ combined: slicedCombined, isFirstYearProRated, proRatedMonths, showPercentages: false });

  const options = useMemo<ChartOptions<'bar'>>(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: getAnimationDuration(),
        easing: 'easeInOutCubic',
      },
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Age',
            color: muted,
            font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          },
          ticks: { color: muted, font: { size: 11 }, maxRotation: 0 },
          grid: { color: border, drawTicks: false },
          border: { color: border },
          stacked: false,
        },
        y: {
          ticks: {
            color: muted,
            font: { size: 11 },
            callback: (val: string | number) => formatCompactCurrency(Number(val)),
          },
          grid: { color: border, drawTicks: false },
          border: { display: false },
          stacked: false,
        },
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: muted,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            padding: 16,
            font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          },
        },
        tooltip: {
          enabled: false,
          external: tooltipHandler,
        },
      },
      phaseBands: slicedPhaseBands,
    } as any;
  }, [tooltipHandler, slicedPhaseBands, muted, border, themeKey]);

  return (
    <div className="relative h-[280px] sm:h-[340px] lg:h-[380px] xl:h-[420px] w-full" role="img" aria-label="Annual financial flows chart showing contributions, withdrawals, and income by age">
      <Bar data={slicedData} options={options} />
    </div>
  );
}