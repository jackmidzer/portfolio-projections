import React from 'react';
import { AccountInput as AccountInputType, AccountType } from '../types';

interface AccountInputProps {
  account: AccountInputType;
  onChange: (account: AccountInputType) => void;
}

const AccountInput: React.FC<AccountInputProps> = ({ account, onChange }) => {
  const handleChange = (field: keyof Omit<AccountInputType, 'name'>, value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({
      ...account,
      [field]: numValue,
    });
  };

  const accountColors: Record<AccountType, string> = {
    Savings: 'border-blue-500',
    Pension: 'border-green-500',
    Brokerage: 'border-purple-500',
  };

  return (
    <div className={`border-l-4 ${accountColors[account.name]} bg-white p-6 rounded-lg shadow-sm`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{account.name}</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="100"
              value={account.currentBalance || ''}
              onChange={(e) => handleChange('currentBalance', e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Contribution
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="10"
              value={account.monthlyContribution || ''}
              onChange={(e) => handleChange('monthlyContribution', e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Annual Return
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={account.expectedReturn || ''}
              onChange={(e) => handleChange('expectedReturn', e.target.value)}
              className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="7"
            />
            <span className="absolute right-3 top-2.5 text-gray-500">%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountInput;
