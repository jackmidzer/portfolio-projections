import { useMemo, useRef, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import type { Chart, ChartData, ChartOptions, TooltipModel } from 'chart.js';
import { getBaseOptions } from './chartConfig';
import type { PhaseBandsOptions } from './phaseBandsPlugin';
import { useSlicedChartData } from './useSlicedChartData';
import { useThemeKey } from '@/hooks/useThemeKey';
import { formatCompactCurrency } from '@/utils/formatters';
import type { CombinedYearData } from '@/utils/calculations';

interface MonteCarloChartProps {
  data: ChartData<'line'>;
  combined: CombinedYearData[];
  phaseBands: PhaseBandsOptions;
  ageRange?: [number, number];
  isLoading?: boolean;
}

/** Simple helper to create a DOM element with classes */
function el(tag: string, classes?: string): HTMLElement {
  const e = document.createElement(tag);
  if (classes) e.className = classes;
  return e;
}

/**
 * External tooltip handler for the Monte Carlo chart.
 * Shows P10, Median, P90, and Deterministic values at the hovered age.
 */
function useMonteCarloTooltip(combined: CombinedYearData[]) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let container = document.getElementById('mc-chartjs-tooltip') as HTMLDivElement | null;
    if (!container) {
      container = document.createElement('div');
      container.id = 'mc-chartjs-tooltip';
      Object.assign(container.style, {
        position: 'absolute',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        zIndex: '50',
      });
      document.body.appendChild(container);
    }
    tooltipRef.current = container;

    return () => {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
        tooltipRef.current = null;
      }
    };
  }, []);

  const handler = useCallback(
    (context: { chart: Chart; tooltip: TooltipModel<any> }) => {
      const { chart, tooltip } = context;
      const root = tooltipRef.current;
      if (!root) return;

      if (tooltip.opacity === 0) {
        root.style.opacity = '0';
        return;
      }

      root.textContent = '';

      const dataIndex = tooltip.dataPoints?.[0]?.dataIndex;
      const age = combined[dataIndex ?? 0]?.age;

      const card = el('div', 'rounded-lg border bg-popover p-3 shadow-md text-popover-foreground');
      card.style.minWidth = '180px';
      card.style.fontFamily = 'Inter, system-ui, sans-serif';

      const header = el('p', 'mb-2 text-sm font-semibold');
      header.textContent = `Age ${age ?? ''}`;
      card.appendChild(header);

      // Collect data points — one per dataset
      const items = (tooltip.dataPoints || []).map((pt) => ({
        color: pt.dataset.borderColor as string,
        label: pt.dataset.label || '',
        value: pt.parsed.y ?? (pt.parsed as any),
        borderDash: (pt.dataset as any).borderDash,
      }));

      // Sort: Median first, then P75 / P90 / Deterministic / P25 / P10
      const ORDER: Record<string, number> = { 'Median (P50)': 0, '90th Percentile': 1, '75th Percentile': 2, 'Deterministic': 3, '25th Percentile': 4, '10th Percentile': 5 };
      items.sort((a, b) => (ORDER[a.label] ?? 99) - (ORDER[b.label] ?? 99));

      for (const item of items) {
        const row = el('div', 'flex items-center justify-between gap-4 text-xs py-0.5');

        const left = el('span', 'flex items-center gap-1.5');
        const dot = el('span', 'inline-block h-2 w-2 rounded-full flex-shrink-0');
        dot.style.background = item.color;
        if (item.borderDash) {
          dot.style.opacity = '0.6';
        }
        left.appendChild(dot);
        const labelSpan = el('span');
        labelSpan.textContent = item.label;
        left.appendChild(labelSpan);
        row.appendChild(left);

        const right = el('span', 'font-medium tabular-nums whitespace-nowrap');
        right.textContent = formatCompactCurrency(item.value);
        row.appendChild(right);

        card.appendChild(row);
      }

      // Spread row (P90 - P10)
      const p90 = items.find((i) => i.label === '90th Percentile');
      const p10 = items.find((i) => i.label === '10th Percentile');
      if (p90 && p10) {
        const spread = p90.value - p10.value;
        const spreadRow = el('div', 'mt-1.5 border-t pt-1.5 flex items-center justify-between text-xs');
        const spreadLabel = el('span', 'text-muted-foreground');
        spreadLabel.textContent = 'P10–P90 Spread';
        spreadRow.appendChild(spreadLabel);
        const spreadVal = el('span', 'font-medium tabular-nums text-muted-foreground');
        spreadVal.textContent = formatCompactCurrency(spread);
        spreadRow.appendChild(spreadVal);
        card.appendChild(spreadRow);
      }

      root.appendChild(card);

      const rect = chart.canvas.getBoundingClientRect();
      const left = rect.left + window.scrollX + tooltip.caretX;
      const top = rect.top + window.scrollY + tooltip.caretY;

      root.style.opacity = '1';
      root.style.left = `${left}px`;
      root.style.top = `${top - 10}px`;
      root.style.transform = 'translate(-50%, -100%)';
    },
    [combined],
  );

  return handler;
}

export function MonteCarloChart({
  data,
  combined,
  phaseBands,
  ageRange,
  isLoading = false,
}: MonteCarloChartProps) {
  const themeKey = useThemeKey();

  const { slicedData, slicedCombined, slicedPhaseBands } = useSlicedChartData({ data, combined, phaseBands, ageRange });

  const tooltipHandler = useMonteCarloTooltip(slicedCombined);

  const options = useMemo<ChartOptions<'line'>>(() => {
    const base = getBaseOptions();
    return {
      ...base,
      scales: {
        ...base.scales,
        y: { ...base.scales?.y, beginAtZero: true },
        x: { ...base.scales?.x },
      },
      plugins: {
        ...base.plugins,
        tooltip: { enabled: false, external: tooltipHandler },
        filler: { propagate: false },
        legend: {
          ...base.plugins?.legend,
          labels: {
            ...(base.plugins?.legend as any)?.labels,
            usePointStyle: true,
            pointStyle: 'line',
          },
        },
      },
      phaseBands: slicedPhaseBands,
    } as any;
  }, [tooltipHandler, slicedPhaseBands, themeKey]);

  return (
    <div
      className="relative h-[240px] sm:h-[280px] lg:h-[320px] xl:h-[360px] w-full"
      role="img"
      aria-label="Monte Carlo simulation chart showing probability bands"
    >
      <Line data={slicedData} options={options} />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/60 backdrop-blur-[2px]">
          <div className="flex items-center gap-2.5">
            <svg
              className="h-5 w-5 animate-spin text-purple-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium text-muted-foreground">Running simulations…</span>
          </div>
        </div>
      )}
    </div>
  );
}
