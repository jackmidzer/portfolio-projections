import React, { useState } from 'react';
import { AccountInput as AccountInputType, PortfolioInputs } from '../types';
import AccountInput from './AccountInput';

interface InputFormProps {
  onCalculate: (inputs: PortfolioInputs) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onCalculate }) => {
  const [accounts, setAccounts] = useState<AccountInputType[]>([
    { name: 'Savings', currentBalance: 10000, monthlyContribution: 500, expectedReturn: 3 },
    { name: 'Pension', currentBalance: 50000, monthlyContribution: 1000, expectedReturn: 7 },
    { name: 'Brokerage', currentBalance: 25000, monthlyContribution: 750, expectedReturn: 8 },
  ]);

  const [currentAge, setCurrentAge] = useState<number>(35);
  const [futureAge, setFutureAge] = useState<number>(65);
  const [errors, setErrors] = useState<string[]>([]);

  const handleAccountChange = (index: number, updatedAccount: AccountInputType) => {
    const newAccounts = [...accounts];
    newAccounts[index] = updatedAccount;
    setAccounts(newAccounts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    // Validation
    if (currentAge < 18 || currentAge > 100) {
      newErrors.push('Current age must be between 18 and 100');
    }
    if (futureAge <= currentAge) {
      newErrors.push('Future age must be greater than current age');
    }
    if (futureAge > 150) {
      newErrors.push('Future age cannot exceed 150');
    }

    setErrors(newErrors);

    if (newErrors.length === 0) {
      const timeHorizon = futureAge - currentAge;
      onCalculate({ accounts, currentAge, futureAge });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Portfolio Inputs</h2>
        <p className="text-gray-600">
          Enter your current balances, monthly contributions, and expected returns for each account.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map((account, index) => (
          <AccountInput
            key={account.name}
            account={account}
            onChange={(updated) => handleAccountChange(index, updated)}
          />
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Age Projection
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="currentAge" className="block text-xs font-medium text-gray-600 mb-2">
              Current Age
            </label>
            <input
              type="number"
              id="currentAge"
              min="18"
              max="100"
              value={currentAge}
              onChange={(e) => setCurrentAge(parseInt(e.target.value) || 18)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="35"
            />
            <p className="mt-1 text-xs text-gray-500">Between 18 and 100</p>
          </div>
          
          <div>
            <label htmlFor="futureAge" className="block text-xs font-medium text-gray-600 mb-2">
              Future Age
            </label>
            <input
              type="number"
              id="futureAge"
              min="19"
              max="150"
              value={futureAge}
              onChange={(e) => setFutureAge(parseInt(e.target.value) || 65)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="65"
            />
            <p className="mt-1 text-xs text-gray-500">Greater than current age</p>
          </div>
        </div>

        {futureAge > currentAge && (
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-900">
            Time horizon: <strong>{futureAge - currentAge} years</strong>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
            {errors.map((error, idx) => (
              <p key={idx} className="text-sm text-red-700">
                • {error}
              </p>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
      >
        Calculate Portfolio Growth
      </button>
    </form>
  );
};

export default InputForm;
