import { useRef, useEffect, useCallback, useId } from 'react';
import type { Chart, TooltipModel } from 'chart.js';
import { formatCompactCurrency } from '@/utils/formatters';
import type { CombinedYearData } from '@/utils/calculations';

interface ExternalTooltipProps {
  /** The combined chart data array — used to determine if the hovered point is pro-rated */
  combined: CombinedYearData[];
  /** Whether the first year is pro-rated */
  isFirstYearProRated: boolean;
  /** Number of months in the pro-rated first year (from projection, not wall-clock time) */
  proRatedMonths?: number;
  /** Whether to show percentage breakdowns next to each item (default: true) */
  showPercentages?: boolean;
}

/** Simple helper to create a DOM element with classes */
function el(tag: string, classes?: string): HTMLElement {
  const e = document.createElement(tag);
  if (classes) e.className = classes;
  return e;
}

/**
 * Returns an `external` tooltip handler for Chart.js that renders
 * a styled HTML tooltip matching the shadcn popover aesthetic.
 * Uses DOM APIs instead of innerHTML to prevent XSS from dataset labels.
 */
export function useExternalTooltip({ combined, isFirstYearProRated, proRatedMonths, showPercentages = true }: ExternalTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipId = useId();

  // Create the tooltip element once on mount
  useEffect(() => {
    let container = document.getElementById(tooltipId) as HTMLDivElement | null;
    if (!container) {
      container = document.createElement('div');
      container.id = tooltipId;
      container.className = 'chartjs-tooltip-container';
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

      // Clear previous content
      root.textContent = '';

      const dataIndex = tooltip.dataPoints?.[0]?.dataIndex;
      const age = combined[dataIndex ?? 0]?.age;
      const isProRated = isFirstYearProRated && dataIndex === 0;

      // Outer card
      const card = el('div', 'rounded-lg border bg-popover p-3 shadow-md text-popover-foreground');
      card.style.minWidth = '160px';
      card.style.fontFamily = 'Inter, system-ui, sans-serif';

      // Header
      const header = el('p', 'mb-2 text-sm font-semibold');
      header.textContent = `Age ${age ?? ''}`;
      if (isProRated && proRatedMonths != null) {
        const badge = el('span', 'ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-700 dark:bg-amber-900/30 dark:text-amber-400');
        badge.textContent = `Pro-rated (${proRatedMonths}m)`;
        header.appendChild(badge);
      }
      card.appendChild(header);

      // Separate scenario overlay lines and total line from the main stacked series
      const allPoints = tooltip.dataPoints || [];
      const mainItems = allPoints
        .filter((pt) => !(pt.dataset as any).isScenarioOverlay && !(pt.dataset as any).isTotalLine)
        .map((pt) => ({
          color: pt.dataset.borderColor as string,
          label: pt.dataset.label || '',
          value: pt.parsed.y ?? (pt.parsed as any),
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

      const scenarioItems = allPoints
        .filter((pt) => (pt.dataset as any).isScenarioOverlay)
        .map((pt) => ({
          color: pt.dataset.borderColor as string,
          label: pt.dataset.label || '',
          value: pt.parsed.y ?? (pt.parsed as any),
        }));

      const total = mainItems.reduce((sum, i) => sum + i.value, 0);

      for (const item of mainItems) {
        const pct = total !== 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';

        const row = el('div', 'flex items-center justify-between gap-4 text-xs py-0.5');

        // Left side: color dot + label
        const left = el('span', 'flex items-center gap-1.5');
        const dot = el('span', 'inline-block h-2 w-2 rounded-full flex-shrink-0');
        dot.style.background = item.color;
        left.appendChild(dot);
        const labelSpan = el('span');
        labelSpan.textContent = item.label;
        left.appendChild(labelSpan);
        row.appendChild(left);

        // Right side: value + optional percentage
        const right = el('span', 'font-medium tabular-nums whitespace-nowrap');
        right.textContent = formatCompactCurrency(item.value);
        if (showPercentages) {
          const pctSpan = el('span', 'text-muted-foreground');
          pctSpan.textContent = ` (${pct}%)`;
          right.appendChild(pctSpan);
        }
        row.appendChild(right);

        card.appendChild(row);
      }

      // Total row if multiple main items
      if (mainItems.length > 1) {
        const totalRow = el('div', 'mt-1.5 border-t pt-1.5 flex items-center justify-between text-xs font-semibold');
        const totalLabel = el('span');
        totalLabel.textContent = 'Total';
        totalRow.appendChild(totalLabel);
        const totalValue = el('span', 'tabular-nums');
        totalValue.textContent = formatCompactCurrency(total);
        totalRow.appendChild(totalValue);
        card.appendChild(totalRow);
      }

      // Scenario overlay rows rendered separately with a divider
      if (scenarioItems.length > 0) {
        const divider = el('div', 'mt-1.5 border-t pt-1.5');
        card.appendChild(divider);

        for (const item of scenarioItems) {
          const row = el('div', 'flex items-center justify-between gap-4 text-xs py-0.5');

          const left = el('span', 'flex items-center gap-1.5');
          const dot = el('span', 'inline-block h-2 w-2 rounded-full flex-shrink-0');
          dot.style.background = item.color;
          left.appendChild(dot);
          const labelSpan = el('span', 'text-muted-foreground italic');
          labelSpan.textContent = item.label;
          left.appendChild(labelSpan);
          row.appendChild(left);

          const right = el('span', 'font-medium tabular-nums whitespace-nowrap text-muted-foreground');
          right.textContent = formatCompactCurrency(item.value);
          row.appendChild(right);

          card.appendChild(row);
        }
      }

      root.appendChild(card);

      // Position
      const rect = chart.canvas.getBoundingClientRect();
      const left = rect.left + window.scrollX + tooltip.caretX;
      const top = rect.top + window.scrollY + tooltip.caretY;

      root.style.opacity = '1';
      root.style.left = `${left}px`;
      root.style.top = `${top - 10}px`;
      root.style.transform = 'translate(-50%, -100%)';
    },
    [combined, isFirstYearProRated, proRatedMonths, showPercentages],
  );

  return handler;
}
