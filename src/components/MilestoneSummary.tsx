import React from 'react';
import { MilestoneSnapshot } from '../types';
import { formatCurrency } from '../utils/formatters';

interface MilestoneSummaryProps {
  snapshot: MilestoneSnapshot;
  title: string;
  ageLabel: string;
}

const MilestoneSummary: React.FC<MilestoneSummaryProps> = ({ snapshot, title, ageLabel }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <div className="text-sm text-gray-600">
          Age: <strong>{snapshot.age} ({ageLabel})</strong>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-1">Total Contributions</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(snapshot.totalContributions)}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-purple-800 mb-1">Total Interest Earned</p>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(snapshot.totalInterest)}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
          <p className="text-sm font-medium text-indigo-800 mb-1">Portfolio Balance</p>
          <p className="text-2xl font-bold text-indigo-900">{formatCurrency(snapshot.totalBalance)}</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {snapshot.accountBalances.map((account) => (
            <div key={account.accountName} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">{account.accountName}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(account.finalBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contributions:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(account.totalContributions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(account.totalInterest)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MilestoneSummary;
