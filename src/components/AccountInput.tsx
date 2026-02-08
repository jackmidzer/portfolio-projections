import React, { useState } from 'react';
import { AccountInput as AccountInputType, AccountType, AgeBracketContributions } from '../types';

interface AccountInputProps {
  account: AccountInputType;
  onChange: (account: AccountInputType) => void;
}

const AccountInput: React.FC<AccountInputProps> = ({ account, onChange }) => {
  const [showBrackets, setShowBrackets] = useState(false);

  const handleChange = (field: keyof Omit<AccountInputType, 'name'>, value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({
      ...account,
      [field]: numValue,
    });
  };

  const handleBracketChange = (bracket: keyof AgeBracketContributions, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (account.ageBracketContributions) {
      onChange({
        ...account,
        ageBracketContributions: {
          ...account.ageBracketContributions,
          [bracket]: numValue,
        },
      });
    }
  };

  const isPensionWithBrackets = account.name === 'Pension' && account.ageBracketContributions;

  const accountColors: Record<AccountType, string> = {
    Savings: 'border-blue-500',
    Pension: 'border-green-500',
    Brokerage: 'border-purple-500',
  };

  const bracketLabels: Record<keyof AgeBracketContributions, string> = {
    under30: 'Under 30',
    age30to39: '30–39',
    age40to49: '40–49',
    age50to54: '50–54',
    age55to59: '55–59',
    age60plus: '60 or over',
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
            <span className="absolute left-3 top-2.5 text-gray-500">€</span>
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

        {!isPensionWithBrackets && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {account.isSalaryPercentage ? 'Contribution % of Salary' : 'Monthly Contribution'}
            </label>
            <div className="relative">
              {!account.isSalaryPercentage && <span className="absolute left-3 top-2.5 text-gray-500">€</span>}
              <input
                type="number"
                min="0"
                step={account.isSalaryPercentage ? '0.1' : '10'}
                value={account.monthlyContribution || ''}
                onChange={(e) => handleChange('monthlyContribution', e.target.value)}
                className={account.isSalaryPercentage ? 'w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent' : 'w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent'}
                placeholder={account.isSalaryPercentage ? '10' : '0'}
              />
              {account.isSalaryPercentage && <span className="absolute right-3 top-2.5 text-gray-500">%</span>}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {account.isSalaryPercentage ? 'Percentage of monthly salary' : 'Fixed monthly amount'}
            </p>
          </div>
        )}

        {isPensionWithBrackets && (
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Contribution
          </label>
          <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
            <button
              type="button"
              onClick={() => setShowBrackets(!showBrackets)}
              className="flex items-center justify-between w-full font-medium text-gray-700"
            >
              <span>Age Brackets</span>
              <span className={`text-gray-400 transition-transform ${showBrackets ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {showBrackets && (
              <div className="mt-4 space-y-3">
                {Object.entries(bracketLabels).map(([bracket, label]) => (
                  <div key={bracket} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Age {label}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={account.ageBracketContributions?.[bracket as keyof AgeBracketContributions] || ''}
                          onChange={(e) => handleBracketChange(bracket as keyof AgeBracketContributions, e.target.value)}
                          className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
            <p className="mt-1 text-xs text-gray-500">
              Percentage of monthly salary by age bracket
            </p>
          </div>
        )}

        {isPensionWithBrackets && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employer Contribution
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={account.employerContributionPercent || ''}
                onChange={(e) => handleChange('employerContributionPercent', e.target.value)}
                className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="8"
              />
              <span className="absolute right-3 top-2.5 text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Employer contribution as % of monthly salary</p>
          </div>
        )}

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
