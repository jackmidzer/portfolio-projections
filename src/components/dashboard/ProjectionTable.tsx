import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PortfolioResults, AccountType, YearlyBreakdown, MonthlyBreakdown, AccountInput } from '@/types';
import { formatCurrency, deflate } from '@/utils/formatters';
import {
  isBridgingPhase,
  isDrawdownPhase,
} from '@/utils/phaseHelpers';
import { calculatePensionWithdrawalTax } from '@/utils/taxCalculations';
import { cn } from '@/lib/utils';
import {
  generateLifecycleEvents,
  getEventsForAge,
  getEventCategoryColor,
} from '@/utils/eventHelpers';

interface ProjectionTableProps {
  results: PortfolioResults;
  accounts?: AccountInput[];
  currentAge?: number;
  targetAge?: number;
  enableHouseWithdrawal?: boolean;
  houseWithdrawalAge?: number;
  enablePensionLumpSum?: boolean;
  pensionLumpSumAge?: number;
  pensionLumpSumMaxAmount?: number;
  includeStatePension?: boolean;
  statePensionAge?: number;
  statePensionWeeklyAmount?: number;
  withdrawalRate?: number;
  showRealValues?: boolean;
  inflationRate?: number;
}

export function ProjectionTable({
  results,
  accounts,
  currentAge,
  targetAge,
  enableHouseWithdrawal,
  houseWithdrawalAge,
  enablePensionLumpSum,
  pensionLumpSumAge,
  pensionLumpSumMaxAmount,
  includeStatePension,
  statePensionAge,
  statePensionWeeklyAmount,
  withdrawalRate,
  showRealValues,
  inflationRate = 2.5,
}: ProjectionTableProps) {
  const [selectedAccount, setSelectedAccount] = useState<AccountType | 'All'>('All');
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  // Generate lifecycle events for badge display
  const lifecycleEvents = useMemo(() => {
    if (!accounts || currentAge == null || targetAge == null) return [];
    return generateLifecycleEvents(results, accounts, currentAge, targetAge, {
      enableHouseWithdrawal,
      houseWithdrawalAge,
      enablePensionLumpSum,
      pensionLumpSumAge,
      pensionLumpSumMaxAmount,
      includeStatePension,
      statePensionAge,
      statePensionWeeklyAmount,
      withdrawalRate,
    });
  }, [results, accounts, currentAge, targetAge, enableHouseWithdrawal, houseWithdrawalAge, enablePensionLumpSum, pensionLumpSumAge, pensionLumpSumMaxAmount, includeStatePension, statePensionAge, statePensionWeeklyAmount, withdrawalRate]);

  const accountResult = selectedAccount === 'All'
    ? null
    : results.accountResults.find(r => r.accountName === selectedAccount);

  const combinedData = useMemo(() => {
    if (selectedAccount === 'All') {
      return results.accountResults[0].yearlyData.map((_, index) => {
        let startingBalance = 0;
        let contributions = 0;
        let interestEarned = 0;
        let withdrawal = 0;
        let endingBalance = 0;
        const age = results.accountResults[0].yearlyData[index].age;
        const salary = results.accountResults[0].yearlyData[index].salary;
        const monthlyData = results.accountResults[0].yearlyData[index].monthlyData.map((m) => {
          const combinedMonth = { ...m };
          results.accountResults.slice(1).forEach((account) => {
            const monthData = account.yearlyData[index].monthlyData[m.month - 1];
            combinedMonth.startingBalance += monthData.startingBalance;
            combinedMonth.contribution += monthData.contribution;
            combinedMonth.interest += monthData.interest;
            combinedMonth.withdrawal += monthData.withdrawal;
            combinedMonth.endingBalance += monthData.endingBalance;
          });
          return combinedMonth;
        });
        results.accountResults.forEach((account) => {
          const yearData = account.yearlyData[index];
          startingBalance += yearData.startingBalance;
          contributions += yearData.contributions;
          interestEarned += yearData.interestEarned;
          withdrawal += yearData.withdrawal;
          endingBalance += yearData.endingBalance;
        });
        return { year: index, age, salary, startingBalance, contributions, interestEarned, withdrawal, endingBalance, monthlyData };
      });
    }
    return accountResult?.yearlyData.map((row, index) => ({ ...row, year: index })) || [];
  }, [selectedAccount, results, accountResult]);

  // For real-value mode, deflate amounts relative to first year
  const baseAge = combinedData[0]?.age ?? currentAge ?? 28;
  const fmt = (value: number, age: number) => {
    if (showRealValues) {
      return formatCurrency(deflate(value, age - baseAge, inflationRate));
    }
    return formatCurrency(value);
  };

  const toggleExpanded = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Year-by-Year Projections{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {showRealValues ? '(Real €)' : '(Nominal €)'}
            </span>
          </CardTitle>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value as AccountType | 'All')}
            aria-label="Select account to display"
            className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="All">All Accounts</option>
            {results.accountResults.map(r => (
              <option key={r.accountName} value={r.accountName}>{r.accountName}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-8 px-2 py-2" />
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Age</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Income</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Tax</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Net Income</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Starting</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Withdrawals</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Contributions</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Interest</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Ending</th>
              </tr>
            </thead>
            <tbody>
              {combinedData.map((row) => {
                const isProRated = results.monthsUntilNextBirthday < 12 && row.year === 0;
                const isBridging = isBridgingPhase(row.age, results.fireAge, results.pensionAge);
                const isDrawdown = isDrawdownPhase(row.age, results.pensionAge);
                const isExpanded = expandedYear === row.year;
                const rowEvents = getEventsForAge(lifecycleEvents, row.age);

                const { annualIncome, annualTax, annualNetIncome } = computeAnnuals(row, isBridging, isDrawdown, selectedAccount, results);
                const annualWithdrawals = row.monthlyData.reduce((s, m) => s + m.withdrawal, 0);
                const annualContributions = row.monthlyData.reduce((s, m) => s + m.contribution, 0);
                const annualInterest = row.monthlyData.reduce((s, m) => s + m.interest, 0);

                return (
                  <React.Fragment key={row.year}>
                    <tr className={cn(
                      'border-b border-border transition-colors hover:bg-muted/30',
                      isProRated && 'bg-amber-50/50 dark:bg-amber-900/10',
                      isBridging && 'bg-indigo-50/50 dark:bg-indigo-900/10',
                      isDrawdown && 'bg-emerald-50/50 dark:bg-emerald-900/10',
                    )}>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => toggleExpanded(row.year)} className="text-muted-foreground hover:text-foreground" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} year ${row.age} details`} aria-expanded={isExpanded}>
                          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                        </button>
                      </td>
                      <td className="px-3 py-2 font-medium">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          {row.age}
                          {isProRated && <Badge variant="outline" className="text-[10px] px-1 py-0">Pro-rated</Badge>}
                          {isDrawdown && <Badge variant="pension" className="text-[10px] px-1 py-0">Drawdown</Badge>}
                          {isBridging && <Badge variant="outline" className="text-[10px] px-1 py-0 border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400">Bridging</Badge>}
                          {rowEvents.map((evt, i) => {
                            const colors = getEventCategoryColor(evt.category);
                            return (
                              <Badge key={i} variant="outline" className={cn('text-[10px] px-1 py-0', colors.bg, colors.text, colors.border)} title={evt.description}>
                                {evt.title}
                              </Badge>
                            );
                          })}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-savings">{fmt(annualIncome, row.age)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">{fmt(annualTax, row.age)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-teal-600 dark:text-teal-400">{fmt(annualNetIncome, row.age)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmt(row.startingBalance, row.age)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-500">{fmt(annualWithdrawals, row.age)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(annualContributions, row.age)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-violet-600 dark:text-violet-400">{fmt(annualInterest, row.age)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(row.endingBalance, row.age)}</td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-b border-border">
                        <td colSpan={10} className="p-0">
                          <MonthlyDetail
                            row={row}
                            isBridging={isBridging}
                            isDrawdown={isDrawdown}
                            selectedAccount={selectedAccount}
                            results={results}
                            annualTax={annualTax}
                            annualNetIncome={annualNetIncome}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout */}
        <div className="space-y-2 px-4 lg:hidden">
          {combinedData.map((row) => {
            const isProRated = results.monthsUntilNextBirthday < 12 && row.year === 0;
            const isBridging = isBridgingPhase(row.age, results.fireAge, results.pensionAge);
            const isDrawdown = isDrawdownPhase(row.age, results.pensionAge);
            const isExpanded = expandedYear === row.year;
            const rowEvents = getEventsForAge(lifecycleEvents, row.age);
            const { annualIncome, annualTax, annualNetIncome } = computeAnnuals(row, isBridging, isDrawdown, selectedAccount, results);
            const annualContributions = row.monthlyData.reduce((s, m) => s + m.contribution, 0);
            const annualInterest = row.monthlyData.reduce((s, m) => s + m.interest, 0);

            return (
              <div key={row.year} className={cn(
                'rounded-lg border p-3',
                isProRated && 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10',
                isBridging && 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-900/10',
                isDrawdown && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10',
              )}>
                <button onClick={() => toggleExpanded(row.year)} className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">Age {row.age}</span>
                    {isProRated && <Badge variant="outline" className="text-[10px]">Pro-rated</Badge>}
                    {isDrawdown && <Badge variant="pension" className="text-[10px]">Drawdown</Badge>}
                    {isBridging && <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-600">Bridging</Badge>}
                    {rowEvents.map((evt, i) => {
                      const colors = getEventCategoryColor(evt.category);
                      return (
                        <Badge key={i} variant="outline" className={cn('text-[10px] px-1 py-0', colors.bg, colors.text, colors.border)}>
                          {evt.title}
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums">{fmt(row.endingBalance, row.age)}</span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
                        <div><span className="text-muted-foreground">Income</span><p className="font-medium tabular-nums">{fmt(annualIncome, row.age)}</p></div>
                        <div><span className="text-muted-foreground">Tax</span><p className="font-medium tabular-nums">{fmt(annualTax, row.age)}</p></div>
                        <div><span className="text-muted-foreground">Net Income</span><p className="font-medium tabular-nums">{fmt(annualNetIncome, row.age)}</p></div>
                        <div><span className="text-muted-foreground">Contributions</span><p className="font-medium tabular-nums">{fmt(annualContributions, row.age)}</p></div>
                        <div><span className="text-muted-foreground">Interest</span><p className="font-medium tabular-nums">{fmt(annualInterest, row.age)}</p></div>
                        <div><span className="text-muted-foreground">Starting</span><p className="font-medium tabular-nums">{fmt(row.startingBalance, row.age)}</p></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Monthly Detail Sub-table ──────────────────────────────
function MonthlyDetail({
  row, isBridging, isDrawdown, selectedAccount, results, annualTax, annualNetIncome
}: {
  row: YearlyBreakdown; isBridging: boolean; isDrawdown: boolean;
  selectedAccount: AccountType | 'All'; results: PortfolioResults;
  annualTax: number; annualNetIncome: number;
}) {
  return (
    <div className="bg-muted/30 p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Monthly Breakdown — Age {row.age}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-1.5 pl-3 text-left font-medium">Month</th>
              <th className="py-1.5 pr-3 text-right font-medium">Income</th>
              <th className="py-1.5 pr-3 text-right font-medium">Tax</th>
              <th className="py-1.5 pr-3 text-right font-medium">Net</th>
              <th className="py-1.5 pr-3 text-right font-medium">Starting</th>
              <th className="py-1.5 pr-3 text-right font-medium">Withdrawal</th>
              <th className="py-1.5 pr-3 text-right font-medium">Contribution</th>
              <th className="py-1.5 pr-3 text-right font-medium">Interest</th>
              <th className="py-1.5 pr-3 text-right font-medium">Ending</th>
            </tr>
          </thead>
          <tbody>
            {row.monthlyData.map((month: MonthlyBreakdown) => {
              let monthlyDisplayIncome = month.salary;
              if (isBridging) {
                if (selectedAccount === 'All') {
                  const brokerage = results.accountResults.find(r => r.accountName === 'Brokerage');
                  monthlyDisplayIncome = brokerage?.yearlyData[row.year]?.monthlyData[month.month - 1]?.withdrawal || 0;
                } else if (selectedAccount === 'Brokerage') {
                  monthlyDisplayIncome = month.withdrawal || 0;
                }
              } else if (isDrawdown) {
                if (selectedAccount === 'All') {
                  const pension = results.accountResults.find(r => r.accountName === 'Pension');
                  monthlyDisplayIncome = pension?.yearlyData[row.year]?.monthlyData[month.month - 1]?.withdrawal || 0;
                } else if (selectedAccount === 'Pension') {
                  monthlyDisplayIncome = month.withdrawal || 0;
                }
              }

              let monthlyDisplayTax = month.monthlyTax || 0;
              let monthlyDisplayNet = month.monthlyNetSalary;
              if ((isBridging || isDrawdown) && monthlyDisplayIncome > 0 && results.taxInputs) {
                monthlyDisplayTax = annualTax / 12;
                monthlyDisplayNet = annualNetIncome / 12;
              } else if (!isBridging && !isDrawdown) {
                monthlyDisplayTax = month.monthlyTax || 0;
                monthlyDisplayNet = month.monthlyNetSalary;
              } else {
                monthlyDisplayTax = 0;
                monthlyDisplayNet = monthlyDisplayIncome;
              }

              return (
                <tr key={month.month} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-1.5 pl-3 text-muted-foreground">{month.monthYear}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{formatCurrency(monthlyDisplayIncome)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(monthlyDisplayTax)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-teal-600 dark:text-teal-400 font-medium">{formatCurrency(monthlyDisplayNet)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{formatCurrency(month.startingBalance)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-red-500">{formatCurrency(month.withdrawal)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(month.contribution)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-violet-600 dark:text-violet-400">{formatCurrency(month.interest)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums font-medium">{formatCurrency(month.endingBalance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Helper: compute annual income/tax/net ─────────────────
function computeAnnuals(
  row: YearlyBreakdown,
  isBridging: boolean,
  isDrawdown: boolean,
  selectedAccount: AccountType | 'All',
  results: PortfolioResults,
) {
  // Extract annual state pension from stored monthly data (same value on all accounts)
  const annualStatePension = row.monthlyData.reduce(
    (s: number, m: MonthlyBreakdown) => s + (m.statePensionIncome || 0), 0
  );

  // Hoist account lookups outside the reduce loop to avoid O(n×accounts) per month
  const brokerageResult = results.accountResults.find(r => r.accountName === 'Brokerage');
  const pensionResult = results.accountResults.find(r => r.accountName === 'Pension');

  const withdrawalIncome = row.monthlyData.reduce((sum: number, month: MonthlyBreakdown) => {
    let inc = month.salary;
    if (isBridging) {
      if (selectedAccount === 'All') {
        inc = brokerageResult?.yearlyData[row.year]?.monthlyData[month.month - 1]?.withdrawal || 0;
      } else if (selectedAccount === 'Brokerage') inc = month.withdrawal || 0;
      else inc = 0;
    } else if (isDrawdown) {
      if (selectedAccount === 'All') {
        inc = pensionResult?.yearlyData[row.year]?.monthlyData[month.month - 1]?.withdrawal || 0;
      } else if (selectedAccount === 'Pension') inc = month.withdrawal || 0;
      else inc = 0;
    }
    return sum + inc;
  }, 0);

  // Include state pension in the displayed income for retirement phases (All or relevant account)
  const showStatePension = (isBridging && (selectedAccount === 'All' || selectedAccount === 'Brokerage'))
    || (isDrawdown && (selectedAccount === 'All' || selectedAccount === 'Pension'));
  const annualIncome = withdrawalIncome + (showStatePension ? annualStatePension : 0);

  let annualGrossIncome = withdrawalIncome;
  if ((isBridging && selectedAccount !== 'All' && selectedAccount !== 'Brokerage') ||
      (isDrawdown && selectedAccount !== 'All' && selectedAccount !== 'Pension')) {
    annualGrossIncome = 0;
  }

  let annualTax = 0;
  let annualNetIncome = 0;
  if (isBridging && annualGrossIncome > 0) {
    // CGT tax on brokerage withdrawal (pre-computed, using cost-basis gain ratio)
    const brokerageYd = brokerageResult?.yearlyData[row.year];
    const sourceMonths = brokerageYd?.monthlyData ?? [];
    const brokerageTax = sourceMonths.reduce((s: number, m: MonthlyBreakdown) => s + (m.withdrawalTax || 0), 0);
    // PAYE/USC on state pension (taxable income)
    const spTax = annualStatePension > 0 && showStatePension
      ? calculatePensionWithdrawalTax(annualStatePension, true, row.age).totalTax
      : 0;
    annualTax = brokerageTax + spTax;
    annualNetIncome = annualIncome - annualTax;
  } else if (isDrawdown && annualGrossIncome > 0) {
    // Pension + state pension combined tax (progressive PAYE/USC applied to total taxable income)
    const totalTaxableIncome = annualGrossIncome + (showStatePension ? annualStatePension : 0);
    const taxR = calculatePensionWithdrawalTax(totalTaxableIncome, true, row.age);
    annualTax = taxR.totalTax;
    annualNetIncome = taxR.netWithdrawal;
  } else if (!isBridging && !isDrawdown) {
    annualTax = row.monthlyData.reduce((s: number, m: MonthlyBreakdown) => s + (m.monthlyTax || 0), 0);
    annualNetIncome = row.monthlyData.reduce((s: number, m: MonthlyBreakdown) => s + m.monthlyNetSalary, 0);
  }

  return { annualIncome, annualTax, annualNetIncome };
}
