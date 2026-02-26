import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
// chartConfig imported for side-effect registration
import { phaseBandsPlugin, type PhaseBandsOptions } from './phaseBandsPlugin';
import { useExternalTooltip } from './useExternalTooltip';
import { formatCompactCurrency } from '@/utils/formatters';
import { getCssColor } from './chartTheme';
import { useThemeKey } from '@/hooks/useThemeKey';
import type { CombinedYearData } from '@/utils/calculations';

import { Chart as ChartJS } from 'chart.js';
ChartJS.register(phaseBandsPlugin);

interface AnnualFlowsChartProps {
  data: ChartData<'bar'>;
  combined: CombinedYearData[];
  phaseBands: PhaseBandsOptions;
  isFirstYearProRated: boolean;
  ageRange?: [number, number];
}

export function AnnualFlowsChart({
  data,
  combined,
  phaseBands,
  isFirstYearProRated,
  ageRange,
}: AnnualFlowsChartProps) {
  const themeKey = useThemeKey();
  const muted = getCssColor('--muted-foreground');
  const border = getCssColor('--border');

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
      } as ChartData<'bar'>,
      slicedCombined: combined.slice(si, ei),
      slicedPhaseBands: { ...phaseBands, ages: ages.slice(si, ei) },
    };
  }, [data, combined, phaseBands, ageRange]);

  const tooltipHandler = useExternalTooltip({ combined: slicedCombined, isFirstYearProRated, showPercentages: false });

  const options = useMemo<ChartOptions<'bar'>>(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
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
    <div className="relative h-[380px] w-full">
      <Bar data={slicedData} options={options} />
    </div>
  );
}