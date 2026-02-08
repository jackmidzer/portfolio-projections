import React from 'react';
import { PortfolioResults } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AccountSummaryProps {
  results: PortfolioResults;
}

const AccountSummary: React.FC<AccountSummaryProps> = ({ results }) => {
  const initialBalance = results.accountResults.reduce(
    (sum, result) => sum + result.yearlyData[0].startingBalance,
    0
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Portfolio Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">Initial Balance</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(initialBalance)}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-1">Total Contributions</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(results.totalContributions)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-purple-800 mb-1">Total Interest Earned</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(results.totalInterest)}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-indigo-800 mb-1">Final Balance</p>
          <p className="text-2xl font-bold text-indigo-900">{formatCurrency(results.totalFinalBalance)}</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.accountResults.map((result) => (
            <div key={result.accountName} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">{result.accountName}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Final Balance:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(result.finalBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contributions:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(result.totalContributions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(result.totalInterest)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountSummary;
