import React, { useState } from 'react';
import { AccountInput as AccountInputType, PortfolioInputs } from '../types';
import AccountInput from './AccountInput';

interface InputFormProps {
  onCalculate: (inputs: PortfolioInputs) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onCalculate }) => {
  const [accounts, setAccounts] = useState<AccountInputType[]>([
    { name: 'Savings', currentBalance: 10000, monthlyContribution: 500, expectedReturn: 3, isSalaryPercentage: false },
    { 
      name: 'Pension', 
      currentBalance: 50000, 
      monthlyContribution: 0, // will be determined by age bracket
      expectedReturn: 7, 
      isSalaryPercentage: true,
      ageBracketContributions: {
        under30: 15,
        age30to39: 20,
        age40to49: 25,
        age50to54: 30,
        age55to59: 35,
        age60plus: 40,
      }
    },
    { name: 'Brokerage', currentBalance: 25000, monthlyContribution: 750, expectedReturn: 8, isSalaryPercentage: false },
  ]);

  const [currentAge, setCurrentAge] = useState<number>(35);
  const [futureAge, setFutureAge] = useState<number>(65);
  const [currentSalary, setCurrentSalary] = useState<number>(60000);
  const [annualSalaryIncrease, setAnnualSalaryIncrease] = useState<number>(3);
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
    if (currentSalary <= 0) {
      newErrors.push('Current salary must be greater than 0');
    }
    if (annualSalaryIncrease < 0 || annualSalaryIncrease > 20) {
      newErrors.push('Annual salary increase must be between 0% and 20%');
    }

    setErrors(newErrors);

    if (newErrors.length === 0) {
      onCalculate({ accounts, currentAge, futureAge, currentSalary, annualSalaryIncrease });
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

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Salary Information
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="currentSalary" className="block text-xs font-medium text-gray-600 mb-2">
              Current Annual Salary
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                id="currentSalary"
                min="0"
                step="1000"
                value={currentSalary}
                onChange={(e) => setCurrentSalary(parseInt(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="60000"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Used for pension contribution calculations</p>
          </div>
          
          <div>
            <label htmlFor="salaryIncrease" className="block text-xs font-medium text-gray-600 mb-2">
              Annual Salary Increase
            </label>
            <div className="relative">
              <input
                type="number"
                id="salaryIncrease"
                min="0"
                max="20"
                step="0.1"
                value={annualSalaryIncrease}
                onChange={(e) => setAnnualSalaryIncrease(parseFloat(e.target.value) || 0)}
                className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="3"
              />
              <span className="absolute right-3 top-2.5 text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Annual salary growth rate</p>
          </div>
        </div>
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
