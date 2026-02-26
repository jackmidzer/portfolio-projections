import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { formatCompactCurrency } from '@/utils/formatters';
import { getCssColor } from './chartTheme';

// Register all Chart.js components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  annotationPlugin,
);

/** Default animation duration for smooth tab transitions */
const TRANSITION_DURATION = 600;

/**
 * Build shared base chart options.
 * Call inside a component or useMemo so CSS custom properties are read at render time.
 */
export function getBaseOptions(overrides?: Partial<ChartOptions<'line'>>): ChartOptions<'line'> {
  const muted = getCssColor('--muted-foreground');
  const border = getCssColor('--border');

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: TRANSITION_DURATION,
      easing: 'easeInOutCubic',
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: muted,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
        },
      },
      tooltip: {
        enabled: false, // we use external HTML tooltip
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Age',
          color: muted,
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
        },
        ticks: {
          color: muted,
          font: { size: 11 },
          maxRotation: 0,
        },
        grid: {
          color: border,
          drawTicks: false,
        },
        border: { color: border },
      },
      y: {
        title: {
          display: false,
        },
        ticks: {
          color: muted,
          font: { size: 11 },
          callback: (val: string | number) => formatCompactCurrency(Number(val)),
        },
        grid: {
          color: border,
          drawTicks: false,
        },
        border: { display: false },
      },
    },
    ...overrides,
  } as ChartOptions<'line'>;
}

/**
 * Build a tooltip formatter item string for a given entry.
 */
export function formatTooltipValue(item: TooltipItem<any>): string {
  return formatCompactCurrency(item.parsed.y ?? item.parsed);
}
