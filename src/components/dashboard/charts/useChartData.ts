import { useMemo } from 'react';
import type { ChartData } from 'chart.js';
import type { AccountType, PortfolioResults } from '@/types';
import { combineYearlyData } from '@/utils/calculations';
import { deflate } from '@/utils/formatters';
import {
  getAccountColor,
  getPrincipalColor,
  getInterestColor,
} from './chartTheme';
import type { PhaseBandsOptions } from './phaseBandsPlugin';
import { useThemeKey } from '@/hooks/useThemeKey';

interface UseChartDataOptions {
  showRealValues?: boolean;
  inflationRate?: number;
  currentAge?: number;
}

/**
 * Central hook that transforms PortfolioResults into memoised Chart.js datasets
 * for all four chart views, plus shared milestone annotations and phase config.
 */
export function useChartData(results: PortfolioResults, options?: UseChartDataOptions) {
  const { showRealValues = false, inflationRate = 2.5, currentAge = 28 } = options ?? {};
  // Re-compute colors when dark/light mode changes
  const themeKey = useThemeKey();

  // Combined data (O(n) optimised)
  const combined = useMemo(
    () => combineYearlyData(results.accountResults, results.fireAge, results.pensionAge),
    [results],
  );

  const ages = useMemo(() => combined.map((d) => d.age), [combined]);

  // Helper to optionally deflate a value
  const adj = (value: number, age: number) =>
    showRealValues ? deflate(value, age - currentAge, inflationRate) : value;

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
          data: combined.map((d) => adj(d.Savings, d.age)),
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
          data: combined.map((d) => adj(d.Pension, d.age)),
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
          data: combined.map((d) => adj(d.Brokerage, d.age)),
          borderColor: getAccountColor('Brokerage'),
          backgroundColor: getAccountColor('Brokerage', 0.35),
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          order: 2,
        },
        {
          label: 'Total',
          data: combined.map((d) => adj(d.Savings + d.Pension + d.Brokerage, d.age)),
          borderColor: 'hsl(220, 14%, 45%)',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 8,
          borderDash: [5, 3],
          borderWidth: 2,
          order: 0,
          stack: 'total',
          isTotalLine: true,
        } as any,
      ],
    }),
    [combined, ages, themeKey, showRealValues, inflationRate, currentAge],
  );

  // ── 2. Contributions vs Growth (stacked area) ───────────────────────────────
  const contributionsGrowthData: ChartData<'line'> = useMemo(
    () => ({
      labels: ages,
      datasets: [
        {
          label: 'Deposits (Principal)',
          data: combined.map((d) => adj(d.Principal, d.age)),
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
          data: combined.map((d) => adj(d.Interest, d.age)),
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
    [combined, ages, themeKey, showRealValues, inflationRate, currentAge],
  );

  // ── 3. Annual Flows (bar chart) ─────────────────────────────────────────────
  const annualFlowsData: ChartData<'bar'> = useMemo(
    () => ({
      labels: ages,
      datasets: [
        {
          label: 'Contributions',
          data: combined.map((d) => adj(d.yearContributions, d.age)),
          backgroundColor: getAccountColor('Pension', 0.7),
          borderColor: getAccountColor('Pension'),
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: 'Interest Earned',
          data: combined.map((d) => adj(d.yearInterest, d.age)),
          backgroundColor: getInterestColor(0.7),
          borderColor: getInterestColor(),
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: 'Withdrawals',
          data: combined.map((d) => (d.yearWithdrawals > 0 ? -adj(d.yearWithdrawals, d.age) : 0)),
          backgroundColor: 'hsla(0, 72%, 51%, 0.6)',
          borderColor: 'hsl(0, 72%, 51%)',
          borderWidth: 1,
          borderRadius: 2,
        },
      ],
    }),
    [combined, ages, themeKey, showRealValues, inflationRate, currentAge],
  );

  // ── 3a. Deposits vs Growth — per-account view ─────────────────────────────
  const perAccountContributionsGrowthData = useMemo(() => {
    const map: Partial<Record<AccountType, ChartData<'line'>>> = {};
    for (const acct of results.accountResults) {
      const labels: number[] = [];
      const principalData: number[] = [];
      const interestData: number[] = [];
      let cumPrincipal = 0;
      let cumInterest = 0;
      for (const yr of acct.yearlyData) {
        labels.push(yr.age);
        cumPrincipal += yr.contributions;
        cumInterest += yr.interestEarned;
        principalData.push(adj(cumPrincipal, yr.age));
        interestData.push(adj(cumInterest, yr.age));
      }
      map[acct.accountName] = {
        labels,
        datasets: [
          {
            label: 'Deposits (Principal)',
            data: principalData,
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
            data: interestData,
            borderColor: getInterestColor(),
            backgroundColor: getInterestColor(0.35),
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHitRadius: 8,
            order: 2,
          },
        ],
      };
    }
    return map;
  }, [results, themeKey, showRealValues, inflationRate, currentAge]);

  // ── 3b. Annual Flows — per-account view ────────────────────────────────────
  const perAccountAnnualFlowsData = useMemo(() => {
    const map: Partial<Record<AccountType, ChartData<'bar'>>> = {};
    for (const acct of results.accountResults) {
      const labels: number[] = [];
      const contributionsData: number[] = [];
      const interestData: number[] = [];
      const withdrawalsData: number[] = [];
      for (const yr of acct.yearlyData) {
        labels.push(yr.age);
        contributionsData.push(adj(yr.contributions, yr.age));
        interestData.push(adj(yr.interestEarned, yr.age));
        withdrawalsData.push(yr.withdrawal > 0 ? -adj(yr.withdrawal, yr.age) : 0);
      }
      map[acct.accountName] = {
        labels,
        datasets: [
          {
            label: 'Contributions',
            data: contributionsData,
            backgroundColor: getAccountColor('Pension', 0.7),
            borderColor: getAccountColor('Pension'),
            borderWidth: 1,
            borderRadius: 2,
          },
          {
            label: 'Interest Earned',
            data: interestData,
            backgroundColor: getInterestColor(0.7),
            borderColor: getInterestColor(),
            borderWidth: 1,
            borderRadius: 2,
          },
          {
            label: 'Withdrawals',
            data: withdrawalsData,
            backgroundColor: 'hsla(0, 72%, 51%, 0.6)',
            borderColor: 'hsl(0, 72%, 51%)',
            borderWidth: 1,
            borderRadius: 2,
          },
        ],
      };
    }
    return map;
  }, [results, themeKey, showRealValues, inflationRate, currentAge]);

  // ── 4. Income Timeline (line chart) ─────────────────────────────────────────
  const incomeTimelineData: ChartData<'line'> = useMemo(() => {
    return {
      labels: ages,
      datasets: [
        {
          label: 'Net Income',
          data: combined.map((d) => adj(d.netIncome, d.age)),
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
  }, [combined, ages, themeKey, showRealValues, inflationRate, currentAge]);

  return {
    combined,
    ages,
    phaseBands,
    portfolioGrowthData,
    contributionsGrowthData,
    annualFlowsData,
    incomeTimelineData,
    perAccountContributionsGrowthData,
    perAccountAnnualFlowsData,
  };
}
