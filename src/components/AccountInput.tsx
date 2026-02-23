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

  const accountColors: Record<AccountType, { bg: string; text: string; accent: string; border: string }> = {
    Savings: { bg: 'bg-blue-50', text: 'text-blue-900', accent: 'text-blue-600', border: 'border-blue-200' },
    Pension: { bg: 'bg-emerald-50', text: 'text-emerald-900', accent: 'text-emerald-600', border: 'border-emerald-200' },
    Brokerage: { bg: 'bg-violet-50', text: 'text-violet-900', accent: 'text-violet-600', border: 'border-violet-200' },
  };

  const accountIcons: Record<AccountType, string> = {
    Savings: '🏦',
    Pension: '📊',
    Brokerage: '📈',
  };

  const colors = accountColors[account.name];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200`}>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{accountIcons[account.name]}</span>
        <div>
          <h3 className={`text-lg font-bold ${colors.text}`}>{account.name}</h3>
          <p className="text-xs text-gray-600">Investment account details</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className={`block text-xs font-semibold tracking-wide ${colors.text} mb-2 uppercase`}>
            Current Balance
          </label>
          <div className="relative">
            <span className={`absolute left-4 top-3.5 ${colors.accent} font-semibold`}>€</span>
            <input
              type="number"
              min="0"
              step="100"
              value={account.currentBalance || ''}
              onChange={(e) => handleChange('currentBalance', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border ${colors.border} rounded-lg bg-white focus:ring-2 ${colors.border} focus:border-transparent transition-all duration-200 placeholder-gray-400`}
              placeholder="0"
            />
          </div>
        </div>

        {!isPensionWithBrackets && (
          <div>
            <label className={`block text-xs font-semibold tracking-wide ${colors.text} mb-2 uppercase`}>
              {account.isSalaryPercentage ? 'Contribution % of Salary' : 'Monthly Contribution'}
            </label>
            <div className="relative">
              {!account.isSalaryPercentage && <span className={`absolute left-4 top-3.5 ${colors.accent} font-semibold`}>€</span>}
              <input
                type="number"
                min="0"
                step={account.isSalaryPercentage ? '0.1' : '10'}
                value={account.monthlyContribution || ''}
                onChange={(e) => handleChange('monthlyContribution', e.target.value)}
                className={`w-full ${!account.isSalaryPercentage ? 'pl-10' : 'pl-4'} pr-10 py-3 border ${colors.border} rounded-lg bg-white focus:ring-2 ${colors.border} focus:border-transparent transition-all duration-200 placeholder-gray-400`}
                placeholder={account.isSalaryPercentage ? '10' : '0'}
              />
              {account.isSalaryPercentage && <span className={`absolute right-4 top-3.5 ${colors.accent} font-semibold`}>%</span>}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              {account.isSalaryPercentage 
                ? account.name === 'Pension' 
                  ? 'Percentage of gross salary' 
                  : 'Percentage of net salary'
                : 'Fixed monthly amount'}
            </p>
          </div>
        )}

        {isPensionWithBrackets && (
          <div>
          <label className={`block text-xs font-semibold tracking-wide ${colors.text} mb-3 uppercase`}>
            Monthly Contribution
          </label>
          <div className={`border ${colors.border} rounded-lg p-4 bg-white`}>
            <button
              type="button"
              onClick={() => setShowBrackets(!showBrackets)}
              className={`flex items-center justify-between w-full font-semibold ${colors.text}`}
            >
              <span>Age Brackets</span>
              <span className={`${colors.accent} transition-transform duration-200 ${showBrackets ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {showBrackets && (
              <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                {(['under30', 'age30to39', 'age40to49', 'age50to54', 'age55to59', 'age60plus'] as const).map((bracket) => {
                  const bracketLabels: Record<typeof bracket, string> = {
                    under30: 'Under 30',
                    age30to39: '30–39',
                    age40to49: '40–49',
                    age50to54: '50–54',
                    age55to59: '55–59',
                    age60plus: '60 or over',
                  };
                  return (
                    <div key={bracket} className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className={`block text-xs font-semibold tracking-wide ${colors.text} mb-2 uppercase`}>
                          Age {bracketLabels[bracket]}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={account.ageBracketContributions?.[bracket] || ''}
                            onChange={(e) => handleBracketChange(bracket, e.target.value)}
                            className={`w-full pl-4 pr-10 py-2.5 border ${colors.border} rounded-lg bg-white focus:ring-2 ${colors.border} focus:border-transparent transition-all duration-200 placeholder-gray-400`}
                            placeholder="0"
                          />
                          <span className={`absolute right-4 top-2.5 ${colors.accent} font-semibold`}>%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
            <p className="mt-2 text-xs text-gray-600">
              Percentage of gross salary by age bracket
            </p>
          </div>
        )}

        {isPensionWithBrackets && (
          <div>
            <label className={`block text-xs font-semibold tracking-wide ${colors.text} mb-2 uppercase`}>
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
                className={`w-full pl-4 pr-10 py-3 border ${colors.border} rounded-lg bg-white focus:ring-2 ${colors.border} focus:border-transparent transition-all duration-200 placeholder-gray-400`}
                placeholder="8"
              />
              <span className={`absolute right-4 top-3.5 ${colors.accent} font-semibold`}>%</span>
            </div>
            <p className="mt-2 text-xs text-gray-600">Your employer matches this % of gross salary</p>
          </div>
        )}

        <div>
          <label className={`block text-xs font-semibold tracking-wide ${colors.text} mb-2 uppercase`}>
            Expected Annual Growth
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={account.expectedReturn || ''}
              onChange={(e) => handleChange('expectedReturn', e.target.value)}
              className={`w-full pl-4 pr-10 py-3 border ${colors.border} rounded-lg bg-white focus:ring-2 ${colors.border} focus:border-transparent transition-all duration-200 placeholder-gray-400`}
              placeholder="7"
            />
            <span className={`absolute right-4 top-3.5 ${colors.accent} font-semibold`}>%</span>
          </div>
        </div>

        <div>
          <label className={`block text-xs font-semibold tracking-wide ${colors.text} mb-3 uppercase`}>
            Bonus Contribution <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          {isPensionWithBrackets ? (
            <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-white transition-colors duration-200">
              <input
                type="checkbox"
                checked={account.bonusContributionPercent !== 0}
                onChange={(e) => handleChange('bonusContributionPercent', e.target.checked ? '-1' : '0')}
                className={`w-5 h-5 rounded border-2 ${colors.border} ${colors.accent} focus:ring-2 focus:ring-offset-2 cursor-pointer accent-current`}
              />
              <span className={`text-sm font-medium ${colors.text}`}>Contribute bonus using age bracket percentages</span>
            </label>
          ) : (
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={account.bonusContributionPercent || ''}
                onChange={(e) => handleChange('bonusContributionPercent', e.target.value)}
                className={`w-full pl-4 pr-10 py-3 border ${colors.border} rounded-lg bg-white focus:ring-2 ${colors.border} focus:border-transparent transition-all duration-200 placeholder-gray-400`}
                placeholder="0"
              />
              <span className={`absolute right-4 top-3.5 ${colors.accent} font-semibold`}>%</span>
            </div>
          )}
          {!isPensionWithBrackets && (
            <p className="mt-2 text-xs text-gray-600">
              {account.name === 'Pension' 
                ? 'Percentage of gross bonus (tax-deductible)'
                : 'Percentage of net bonus'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountInput;
