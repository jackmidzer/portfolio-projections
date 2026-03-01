import { AccountResults } from '@/types';

/**
 * Flatten account results into CSV rows and trigger a download.
 */
export function exportProjectionCsv(accountResults: AccountResults[]): void {
  const headers = [
    'Year',
    'Age',
    'Account',
    'Starting Balance',
    'Contributions',
    'Interest Earned',
    'Withdrawals',
    'Ending Balance',
    'Net Salary',
  ];

  const rows: string[][] = [];

  for (const result of accountResults) {
    for (const yd of result.yearlyData) {
      // Compute annual net salary from monthly data
      const annualNetSalary = yd.monthlyData.reduce(
        (sum, m) => sum + (m.monthlyNetSalary || 0),
        0,
      );

      rows.push([
        String(yd.year),
        String(yd.age),
        result.accountName,
        yd.startingBalance.toFixed(2),
        yd.contributions.toFixed(2),
        yd.interestEarned.toFixed(2),
        yd.withdrawal.toFixed(2),
        yd.endingBalance.toFixed(2),
        annualNetSalary.toFixed(2),
      ]);
    }
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  downloadFile(csvContent, 'text/csv', `portfolio-projection-${todayISO()}.csv`);
}

/**
 * Export the currently visible chart canvas as a PNG.
 * Searches for <canvas> elements inside the given container selector.
 * Background colour matches the active light/dark theme.
 */
export function exportChartPng(
  containerSelector = '[data-chart-container]',
): void {
  const isDark = document.documentElement.classList.contains('dark');
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const canvas = container.querySelector('canvas');
  if (!canvas) return;

  // Composite the chart onto a solid background matching the current theme
  const offscreen = document.createElement('canvas');
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);
  ctx.drawImage(canvas, 0, 0);

  const dataUrl = offscreen.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `portfolio-chart-${todayISO()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trigger a print-based PDF export using window.print().
 * The @media print styles in index.css hide the sidebar and format the dashboard.
 */
export function exportPdf(): void {
  window.print();
}

// ─── Helpers ───────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadFile(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
