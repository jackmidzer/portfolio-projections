import React, { useState } from 'react';
import { PortfolioResults, AccountType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ResultsTableProps {
  results: PortfolioResults;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [selectedAccount, setSelectedAccount] = useState<AccountType | 'All'>(
    results.accountResults[0].accountName
  );

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
          let endingBalance = 0;
          const age = results.accountResults[0].yearlyData[index].age;

          results.accountResults.forEach((account) => {
            const yearData = account.yearlyData[index];
            startingBalance += yearData.startingBalance;
            contributions += yearData.contributions;
            interestEarned += yearData.interestEarned;
            endingBalance += yearData.endingBalance;
          });

          return {
            year: index + 1,
            age,
            startingBalance,
            contributions,
            interestEarned,
            endingBalance,
          };
        })
      : accountResult?.yearlyData || [];

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Starting Balance
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
          <tbody className="bg-white divide-y divide-gray-200">
            {combinedData.map((row, index) => {
              const isFirstYearProRated = results.monthsUntilNextBirthday < 12 && row.year === 0;
              return (
              <tr key={row.year} className={isFirstYearProRated ? 'hover:bg-orange-50 bg-orange-50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.age}
                  {isFirstYearProRated && (
                    <span className="ml-2 text-xs font-normal text-orange-600 bg-white px-2 py-1 rounded border border-orange-200">
                      Pro-rated ({results.monthsUntilNextBirthday}m)
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                  {formatCurrency(row.startingBalance)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                  {formatCurrency(row.contributions)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                  {formatCurrency(row.interestEarned)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                  {formatCurrency(row.endingBalance)}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
