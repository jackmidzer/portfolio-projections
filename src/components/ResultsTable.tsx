import React, { useState } from 'react';
import { PortfolioResults, AccountType } from '../types';
import { formatCurrency, getMonthsUntilYearEnd } from '../utils/formatters';
import {
  isWorkingPhase,
  isEarlyRetirementPhase,
  isPensionPhase,
} from '../utils/phaseHelpers';
import { calculatePensionWithdrawalTax, calculateBrokerageCapitalGainsTax } from '../utils/taxCalculations';

interface ResultsTableProps {
  results: PortfolioResults;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [selectedAccount, setSelectedAccount] = useState<AccountType | 'All'>(
    'All'
  );
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const accountResult =
    selectedAccount === 'All'
      ? null
      : results.accountResults.find((r) => r.accountName === selectedAccount);

  // Combine data for "All" view
  const combinedData =
    selectedAccount === 'All'
      ? results.accountResults[0].yearlyData.map((_, index) => {
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
                // monthlyNetSalary is the same across all accounts, so we don't add it
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

            return {
              year: index,
              age,
              salary,
              startingBalance,
              contributions,
              interestEarned,
              withdrawal,
              endingBalance,
              monthlyData,
            };
          })
        : accountResult?.yearlyData.map((row, index) => ({
            ...row,
            year: index,
          })) || [];

  const toggleExpanded = (year: number) => {
    // If the same year is clicked, close it. Otherwise, open the new year (closing any previous one)
    setExpandedYear(expandedYear === year ? null : year);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Year-by-Year Breakdown</h2>
        
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value as AccountType | 'All')}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="All">All Accounts</option>
          {results.accountResults.map((result) => (
            <option key={result.accountName} value={result.accountName}>
              {result.accountName}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tax
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Starting Balance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Withdrawals
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contributions
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Interest Earned
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ending Balance
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {combinedData.map((row) => {
              const isFirstYearProRated = results.monthsUntilNextBirthday < 12 && row.year === 0;
              const isInEarlyRetirement = isEarlyRetirementPhase(
                row.age,
                results.earlyRetirementAge,
                results.pensionAge
              );
              const isInPension = isPensionPhase(row.age, results.pensionAge);
              void isWorkingPhase(row.age, results.earlyRetirementAge); // Reserved for future working-phase-specific logic
              const isExpanded = expandedYear === row.year;
              
              // Calculate all yearly metrics by summing monthly data
              const annualIncome = row.monthlyData.reduce((sum, month) => {
                let monthlyDisplayIncome = month.salary;
                if (isInEarlyRetirement) {
                  if (selectedAccount === 'All') {
                    // For "All Accounts" during early retirement: ONLY brokerage withdrawals (no salary)
                    const brokerageAccount = results.accountResults.find(r => r.accountName === 'Brokerage');
                    const monthDataIndex = month.month - 1;
                    monthlyDisplayIncome = brokerageAccount?.yearlyData[row.year]?.monthlyData[monthDataIndex]?.withdrawal || 0;
                  } else if (selectedAccount === 'Brokerage') {
                    monthlyDisplayIncome = month.withdrawal || 0;
                  } else {
                    // Savings account: no withdrawals during early retirement
                    monthlyDisplayIncome = 0;
                  }
                } else if (isInPension) {
                  if (selectedAccount === 'All') {
                    // For "All Accounts" during pension: ONLY pension withdrawals (no salary)
                    const pensionAccount = results.accountResults.find(r => r.accountName === 'Pension');
                    const monthDataIndex = month.month - 1;
                    monthlyDisplayIncome = pensionAccount?.yearlyData[row.year]?.monthlyData[monthDataIndex]?.withdrawal || 0;
                  } else if (selectedAccount === 'Pension') {
                    monthlyDisplayIncome = month.withdrawal || 0;
                  } else {
                    // Other accounts: no withdrawals during pension phase
                    monthlyDisplayIncome = 0;
                  }
                }
                return sum + monthlyDisplayIncome;
              }, 0);
              // Calculate annual gross income (withdrawal or salary)
              let annualGrossIncome = 0;
              if (isInEarlyRetirement) {
                // Early retirement: ONLY brokerage withdrawals (no salary)
                if (selectedAccount === 'All') {
                  annualGrossIncome = annualIncome; // Only brokerage withdrawals
                } else if (selectedAccount === 'Brokerage') {
                  annualGrossIncome = annualIncome;
                } else {
                  annualGrossIncome = 0; // No income from other accounts
                }
              } else if (isInPension) {
                // Pension phase: ONLY pension withdrawals (no salary)
                if (selectedAccount === 'All') {
                  annualGrossIncome = annualIncome; // Only pension withdrawals
                } else if (selectedAccount === 'Pension') {
                  annualGrossIncome = annualIncome;
                } else {
                  annualGrossIncome = 0; // No income from other accounts
                }
              } else {
                // Working phase: salary only
                annualGrossIncome = row.monthlyData.reduce((sum, month) => sum + month.salary, 0);
              }

              // Calculate tax and net income
              let annualTax = 0;
              let annualNetIncome = 0;

              if (isInEarlyRetirement && annualGrossIncome > 0) {
                // Early retirement: ONLY brokerage withdrawal, taxed at 33% CGT
                const taxResult = calculateBrokerageCapitalGainsTax(annualGrossIncome);
                annualTax = taxResult.cgt;
                annualNetIncome = taxResult.netWithdrawal;
              } else if (isInPension && annualGrossIncome > 0) {
                // Pension phase: ONLY pension withdrawal, taxed at income tax + €245 credit
                const taxResult = calculatePensionWithdrawalTax(annualGrossIncome, true);
                annualTax = taxResult.totalTax;
                annualNetIncome = taxResult.netWithdrawal;
              } else if (!isInEarlyRetirement && !isInPension) {
                // Working phase: use existing salary tax calculations
                annualTax = row.monthlyData.reduce((sum, month) => sum + (month.monthlyTax || 0), 0);
                annualNetIncome = row.monthlyData.reduce((sum, month) => sum + month.monthlyNetSalary, 0);
              } else {
                // No income, no tax
                annualNetIncome = 0;
              }
              const annualWithdrawals = row.monthlyData.reduce((sum, month) => sum + month.withdrawal, 0);
              const annualContributions = row.monthlyData.reduce((sum, month) => sum + month.contribution, 0);
              const annualInterest = row.monthlyData.reduce((sum, month) => sum + month.interest, 0);
              
              let rowBgClass = 'border-b border-gray-200 hover:bg-gray-50';
              if (isFirstYearProRated) {
                rowBgClass = 'bg-orange-50 hover:bg-orange-100';
              } else if (isInPension) {
                rowBgClass = 'bg-emerald-50 hover:bg-emerald-100';
              } else if (isInEarlyRetirement) {
                rowBgClass = 'bg-indigo-50 hover:bg-indigo-100';
              }
              return (
                <React.Fragment key={row.year}>
                  <tr className={rowBgClass}>
                    <td className="px-2 py-4 text-center">
                      <button
                        onClick={() => toggleExpanded(row.year)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Toggle month-by-month breakdown"
                      >
                        <span className={`inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.age}
                      {isFirstYearProRated && (
                        <span className="ml-2 text-xs font-normal text-orange-600 bg-white px-2 py-1 rounded border border-orange-200">
                          Pro-rated ({getMonthsUntilYearEnd()}m)
                        </span>
                      )}
                      {isInPension && (
                        <span className="ml-2 text-xs font-normal text-emerald-600 bg-white px-2 py-1 rounded border border-emerald-200">
                          Pension Withdrawals
                        </span>
                      )}
                      {isInEarlyRetirement && (
                        <span className="ml-2 text-xs font-normal text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-200">
                          Early Retirement
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                      {formatCurrency(annualIncome)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 font-medium">
                      {formatCurrency(annualTax)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-teal-600 font-medium">
                      {formatCurrency(annualNetIncome)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                      {formatCurrency(row.startingBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {formatCurrency(annualWithdrawals)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(annualContributions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                      {formatCurrency(annualInterest)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(row.endingBalance)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="text-xs font-semibold text-gray-600 mb-3">Monthly Breakdown for Age {row.age}</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-600 border-b border-gray-300">
                                <th className="text-left py-2 pl-4 font-medium">Month / Year</th>
                                <th className="text-right py-2 pr-4 font-medium">Income</th>
                                <th className="text-right py-2 pr-4 font-medium">Tax</th>
                                <th className="text-right py-2 pr-4 font-medium">Net</th>
                                <th className="text-right py-2 pr-4 font-medium">Starting</th>
                                <th className="text-right py-2 pr-4 font-medium">Withdrawal</th>
                                <th className="text-right py-2 pr-4 font-medium">Contribution</th>
                                <th className="text-right py-2 pr-4 font-medium">Interest</th>
                                <th className="text-right py-2 pr-4 font-medium">Ending</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.monthlyData.map((month) => {
                                // Calculate monthly display income based on phase
                                let monthlyDisplayIncome = month.salary;
                                if (isInEarlyRetirement) {
                                  if (selectedAccount === 'All') {
                                    const brokerageAccount = results.accountResults.find(r => r.accountName === 'Brokerage');
                                    const monthDataIndex = month.month - 1;
                                    monthlyDisplayIncome = brokerageAccount?.yearlyData[row.year]?.monthlyData[monthDataIndex]?.withdrawal || 0;
                                  } else if (selectedAccount === 'Brokerage') {
                                    monthlyDisplayIncome = month.withdrawal || 0;
                                  }
                                } else if (isInPension) {
                                  if (selectedAccount === 'All') {
                                    const pensionAccount = results.accountResults.find(r => r.accountName === 'Pension');
                                    const monthDataIndex = month.month - 1;
                                    monthlyDisplayIncome = pensionAccount?.yearlyData[row.year]?.monthlyData[monthDataIndex]?.withdrawal || 0;
                                  } else if (selectedAccount === 'Pension') {
                                    monthlyDisplayIncome = month.withdrawal || 0;
                                  }
                                }

                                // Calculate monthly display tax and net income
                                let monthlyDisplayTax = month.monthlyTax || 0;
                                let monthlyDisplayNet = month.monthlyNetSalary;
                                
                                if ((isInEarlyRetirement || isInPension) && monthlyDisplayIncome > 0 && results.enableTaxCalculation && results.taxInputs) {
                                  // Show monthly share of the annual tax calculated above
                                  monthlyDisplayTax = annualTax / 12;
                                  monthlyDisplayNet = annualNetIncome / 12;
                                } else if (!isInEarlyRetirement && !isInPension) {
                                  // Working phase: use existing tax calculations from month data
                                  monthlyDisplayTax = month.monthlyTax || 0;
                                  monthlyDisplayNet = month.monthlyNetSalary;
                                } else {
                                  // No tax calculation, show withdrawal as net
                                  monthlyDisplayTax = 0;
                                  monthlyDisplayNet = monthlyDisplayIncome;
                                }

                                return (
                                <tr key={month.month} className="border-b border-gray-200 hover:bg-gray-100">
                                  <td className="text-left py-2 pl-4 text-gray-700">{month.monthYear}</td>
                                  <td className="text-right py-2 pr-4 text-blue-600">{formatCurrency(monthlyDisplayIncome)}</td>
                                  <td className="text-right py-2 pr-4 text-orange-600">{formatCurrency(monthlyDisplayTax)}</td>
                                  <td className="text-right py-2 pr-4 text-teal-600 font-medium">{formatCurrency(monthlyDisplayNet)}</td>
                                  <td className="text-right py-2 pr-4 text-gray-600">{formatCurrency(month.startingBalance)}</td>
                                  <td className="text-right py-2 pr-4 text-red-600">{formatCurrency(month.withdrawal)}</td>
                                  <td className="text-right py-2 pr-4 text-green-600">{formatCurrency(month.contribution)}</td>
                                  <td className="text-right py-2 pr-4 text-purple-600">{formatCurrency(month.interest)}</td>
                                  <td className="text-right py-2 pr-4 font-medium text-gray-900">{formatCurrency(month.endingBalance)}</td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
