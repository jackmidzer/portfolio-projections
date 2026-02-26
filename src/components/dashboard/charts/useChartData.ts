import { useMemo } from 'react';
import type { ChartData } from 'chart.js';
import type { PortfolioResults } from '@/types';
import { combineYearlyData } from '@/utils/calculations';
import {
  getAccountColor,
  getPrincipalColor,
  getInterestColor,
} from './chartTheme';
import type { PhaseBandsOptions } from './phaseBandsPlugin';
import { useThemeKey } from '@/hooks/useThemeKey';

/**
 * Central hook that transforms PortfolioResults into memoised Chart.js datasets
 * for all four chart views, plus shared milestone annotations and phase config.
 */
export function useChartData(results: PortfolioResults) {
  // Re-compute colors when dark/light mode changes
  const themeKey = useThemeKey();

  // Combined data (O(n) optimised)
  const combined = useMemo(
    () => combineYearlyData(results.accountResults, results.fireAge, results.pensionAge),
    [results],
  );

  const ages = useMemo(() => combined.map((d) => d.age), [combined]);

  // Phase bands config (shared by all charts)
  const phaseBands: PhaseBandsOptions = useMemo(
    () => ({
      fireAge: results.fireAge,
      pensionAge: results.pensionAge,
      ages,
    }),
    [results.fireAge, results.pensionAge, ages],
  );

  // ── 1. Portfolio Growth (stacked area) ──────────────────────────────────────
  const portfolioGrowthData: ChartData<'line'> = useMemo(
    () => ({
      labels: ages,
      datasets: [
        {
          label: 'Savings',
          data: combined.map((d) => d.Savings),
          borderColor: getAccountColor('Savings'),
          backgroundColor: getAccountColor('Savings', 0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 1,
        },
        {
          label: 'Pension',
          data: combined.map((d) => d.Pension),
          borderColor: getAccountColor('Pension'),
          backgroundColor: getAccountColor('Pension', 0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 3,
        },
        {
          label: 'Brokerage',
          data: combined.map((d) => d.Brokerage),
          borderColor: getAccountColor('Brokerage'),
          backgroundColor: getAccountColor('Brokerage', 0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 2,
        },
      ],
    }),
    [combined, ages, themeKey],
  );

  // ── 2. Contributions vs Growth (stacked area) ───────────────────────────────
  const contributionsGrowthData: ChartData<'line'> = useMemo(
    () => ({
      labels: ages,
      datasets: [
        {
          label: 'Deposits (Principal)',
          data: combined.map((d) => d.Principal),
          borderColor: getPrincipalColor(),
          backgroundColor: getPrincipalColor(0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 1,
        },
        {
          label: 'Growth (Interest)',
          data: combined.map((d) => d.Interest),
          borderColor: getInterestColor(),
          backgroundColor: getInterestColor(0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 2,
        },
      ],
    }),
    [combined, ages, themeKey],
  );

  // ── 3. Annual Flows (bar chart) ─────────────────────────────────────────────
  const annualFlowsData: ChartData<'bar'> = useMemo(
    () => ({
      labels: ages,
      datasets: [
        {
          label: 'Contributions',
          data: combined.map((d) => d.yearContributions),
          backgroundColor: getAccountColor('Pension', 0.7),
          borderColor: getAccountColor('Pension'),
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: 'Interest Earned',
          data: combined.map((d) => d.yearInterest),
          backgroundColor: getInterestColor(0.7),
          borderColor: getInterestColor(),
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: 'Withdrawals',
          data: combined.map((d) => (d.yearWithdrawals > 0 ? -d.yearWithdrawals : 0)),
          backgroundColor: 'hsla(0, 72%, 51%, 0.6)',
          borderColor: 'hsl(0, 72%, 51%)',
          borderWidth: 1,
          borderRadius: 2,
        },
      ],
    }),
    [combined, ages, themeKey],
  );

  // ── 4. Income Timeline (line chart) ─────────────────────────────────────────
  const incomeTimelineData: ChartData<'line'> = useMemo(() => {
    return {
      labels: ages,
      datasets: [
        {
          label: 'Net Income',
          data: combined.map((d) => d.netIncome),
          borderColor: getAccountColor('Pension'),
          backgroundColor: getAccountColor('Pension', 0.15),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderWidth: 2,
        },
      ],
    };
  }, [combined, ages, themeKey]);

  return {
    combined,
    ages,
    phaseBands,
    portfolioGrowthData,
    contributionsGrowthData,
    annualFlowsData,
    incomeTimelineData,
  };
}
