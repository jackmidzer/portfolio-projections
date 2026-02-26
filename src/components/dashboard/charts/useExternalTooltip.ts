import { useRef, useEffect, useCallback } from 'react';
import type { Chart, TooltipModel } from 'chart.js';
import { formatCompactCurrency } from '@/utils/formatters';
import { getMonthsUntilYearEnd } from '@/utils/formatters';
import type { CombinedYearData } from '@/utils/calculations';

interface ExternalTooltipProps {
  /** The combined chart data array — used to determine if the hovered point is pro-rated */
  combined: CombinedYearData[];
  /** Whether the first year is pro-rated */
  isFirstYearProRated: boolean;
  /** Whether to show percentage breakdowns next to each item (default: true) */
  showPercentages?: boolean;
}

/**
 * Returns an `external` tooltip handler for Chart.js that renders
 * a styled HTML tooltip matching the shadcn popover aesthetic.
 */
export function useExternalTooltip({ combined, isFirstYearProRated, showPercentages = true }: ExternalTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Create the tooltip element once on mount
  useEffect(() => {
    let el = document.getElementById('chartjs-tooltip') as HTMLDivElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'chartjs-tooltip';
      el.className = 'chartjs-tooltip-container';
      // Styles set via inline so it works in any context
      Object.assign(el.style, {
        position: 'absolute',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        zIndex: '50',
      });
      document.body.appendChild(el);
    }
    tooltipRef.current = el;

    return () => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
        tooltipRef.current = null;
      }
    };
  }, []);

  const handler = useCallback(
    (context: { chart: Chart; tooltip: TooltipModel<any> }) => {
      const { chart, tooltip } = context;
      const el = tooltipRef.current;
      if (!el) return;

      if (tooltip.opacity === 0) {
        el.style.opacity = '0';
        return;
      }

      // Build content
      const dataIndex = tooltip.dataPoints?.[0]?.dataIndex;
      const age = combined[dataIndex ?? 0]?.age;
      const isProRated = isFirstYearProRated && dataIndex === 0;

      let html = `<div class="rounded-lg border bg-popover p-3 shadow-md text-popover-foreground" style="min-width:160px;font-family:Inter,system-ui,sans-serif">`;
      html += `<p class="mb-2 text-sm font-semibold">Age ${age ?? ''}`;
      if (isProRated) {
        html += `<span class="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pro-rated (${getMonthsUntilYearEnd()}m)</span>`;
      }
      html += `</p>`;

      // Sort entries by value descending for readability
      const items = (tooltip.dataPoints || [])
        .map((pt) => ({
          color: pt.dataset.borderColor as string,
          label: pt.dataset.label || '',
          value: pt.parsed.y ?? (pt.parsed as any),
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

      // Total
      const total = items.reduce((sum, i) => sum + i.value, 0);

      for (const item of items) {
        const pct = total !== 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
        html += `<div class="flex items-center justify-between gap-4 text-xs py-0.5">`;
        html += `<span class="flex items-center gap-1.5">`;
        html += `<span class="inline-block h-2 w-2 rounded-full flex-shrink-0" style="background:${item.color}"></span>`;
        html += `<span>${item.label}</span>`;
        html += `</span>`;
        html += `<span class="font-medium tabular-nums whitespace-nowrap">${formatCompactCurrency(item.value)}`;
        if (showPercentages) {
          html += ` <span class="text-muted-foreground">(${pct}%)</span>`;
        }
        html += `</span>`;
        html += `</div>`;
      }

      // Total row if multiple items
      if (items.length > 1) {
        html += `<div class="mt-1.5 border-t pt-1.5 flex items-center justify-between text-xs font-semibold">`;
        html += `<span>Total</span>`;
        html += `<span class="tabular-nums">${formatCompactCurrency(total)}</span>`;
        html += `</div>`;
      }

      html += `</div>`;
      el.innerHTML = html;

      // Position — use getBoundingClientRect for correct placement regardless of nesting / scroll
      const rect = chart.canvas.getBoundingClientRect();
      const left = rect.left + window.scrollX + tooltip.caretX;
      const top = rect.top + window.scrollY + tooltip.caretY;

      el.style.opacity = '1';
      el.style.left = `${left}px`;
      el.style.top = `${top - 10}px`;
      el.style.transform = 'translate(-50%, -100%)';
    },
    [combined, isFirstYearProRated, showPercentages],
  );

  return handler;
}
