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

  const [timeHorizon, setTimeHorizon] = useState<number>(20);

  const handleAccountChange = (index: number, updatedAccount: AccountInputType) => {
    const newAccounts = [...accounts];
    newAccounts[index] = updatedAccount;
    setAccounts(newAccounts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate({ accounts, timeHorizon });
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Horizon (Years)
        </label>
        <input
          type="number"
          min="1"
          max="50"
          value={timeHorizon}
          onChange={(e) => setTimeHorizon(parseInt(e.target.value) || 1)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="20"
        />
        <p className="mt-2 text-sm text-gray-500">
          Choose between 1 and 50 years
        </p>
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
