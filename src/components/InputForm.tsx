import React, { useState } from 'react';
import { AccountInput as AccountInputType, PortfolioInputs } from '../types';
import AccountInput from './AccountInput';

interface InputFormProps {
  onCalculate: (inputs: PortfolioInputs) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onCalculate }) => {
  const [accounts, setAccounts] = useState<AccountInputType[]>([
    { name: 'Savings', currentBalance: 10000, monthlyContribution: 500, expectedReturn: 2, isSalaryPercentage: false },
    { 
      name: 'Pension', 
      currentBalance: 25000, 
      monthlyContribution: 0, // will be determined by age bracket
      expectedReturn: 7, 
      isSalaryPercentage: true,
      employerContributionPercent: 8,
      ageBracketContributions: {
        under30: 15,
        age30to39: 20,
        age40to49: 25,
        age50to54: 30,
        age55to59: 35,
        age60plus: 40,
      }
    },
    { name: 'Brokerage', currentBalance: 20000, monthlyContribution: 1250, expectedReturn: 8, isSalaryPercentage: false },
  ]);

  const [dateOfBirth, setDateOfBirth] = useState<string>('1997-10-03'); // Default to my date of birth
  const [targetAge, setTargetAge] = useState<number | ''>(65);
  const [currentSalary, setCurrentSalary] = useState<number | ''>(70000);
  const [annualSalaryIncrease, setAnnualSalaryIncrease] = useState<number | ''>(2);
  const [errors, setErrors] = useState<string[]>([]);

  // Helper function to calculate current age from date of birth
  const calculateAgeFromDOB = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper function to calculate months remaining until next birthday
  const calculateMonthsUntilBirthday = (dob: string): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    if (nextBirthday < today) {
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }
    
    const monthsLeft = (nextBirthday.getFullYear() - today.getFullYear()) * 12 + (nextBirthday.getMonth() - today.getMonth());
    return monthsLeft;
  };

  const currentAge = dateOfBirth ? calculateAgeFromDOB(dateOfBirth) : '';
  const monthsUntilBirthday = dateOfBirth ? calculateMonthsUntilBirthday(dateOfBirth) : 0;

  const handleAccountChange = (index: number, updatedAccount: AccountInputType) => {
    const newAccounts = [...accounts];
    newAccounts[index] = updatedAccount;
    setAccounts(newAccounts);
  };

  const isFormValid = (): boolean => {
    // Check if any field is empty
    if (dateOfBirth === '' || targetAge === '' || currentSalary === '' || annualSalaryIncrease === '') {
      return false;
    }

    // Convert to numbers for validation
    const age = typeof currentAge === 'number' ? currentAge : parseInt(currentAge as string);
    const future = typeof targetAge === 'number' ? targetAge : parseInt(targetAge);
    const salary = typeof currentSalary === 'number' ? currentSalary : parseInt(currentSalary);
    const increase = typeof annualSalaryIncrease === 'number' ? annualSalaryIncrease : parseInt(annualSalaryIncrease);

    // Check for NaN
    if (isNaN(age) || isNaN(future) || isNaN(salary) || isNaN(increase)) {
      return false;
    }

    // Check all validation conditions
    if (age < 18 || age > 100) return false;
    if (future <= age || future > 150) return false;
    if (salary <= 0) return false;
    if (increase < 0 || increase > 20) return false;

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    // Convert to numbers for validation
    const age = typeof currentAge === 'number' ? currentAge : parseInt(currentAge as string);
    const future = typeof targetAge === 'number' ? targetAge : parseInt(targetAge);
    const salary = typeof currentSalary === 'number' ? currentSalary : parseInt(currentSalary);
    const increase = typeof annualSalaryIncrease === 'number' ? annualSalaryIncrease : parseInt(annualSalaryIncrease);

    // Validation
    if (!dateOfBirth) {
      newErrors.push('Date of birth is required');
    }
    if (age < 18 || age > 100) {
      newErrors.push('Current age must be between 18 and 100');
    }
    if (future <= age) {
      newErrors.push('Target age must be greater than current age');
    }
    if (future > 150) {
      newErrors.push('Target age cannot exceed 150');
    }
    if (salary <= 0) {
      newErrors.push('Current salary must be greater than 0');
    }
    if (increase < 0 || increase > 20) {
      newErrors.push('Annual salary increase must be between 0% and 20%');
    }

    setErrors(newErrors);

    if (newErrors.length === 0) {
      onCalculate({ accounts, dateOfBirth: new Date(dateOfBirth), currentAge: age, targetAge: future, currentSalary: salary, annualSalaryIncrease: increase, monthsUntilNextBirthday: monthsUntilBirthday });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Portfolio Inputs</h2>
        <p className="text-gray-600">
          Enter your current balances, monthly contributions, and expected returns for each account.
        </p>
      </div> */}

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
              <span className="absolute left-3 top-2.5 text-gray-500">€</span>
              <input
                type="number"
                id="currentSalary"
                min="0"
                step="1000"
                value={currentSalary}
                onChange={(e) => setCurrentSalary(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="70000"
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
                onChange={(e) => setAnnualSalaryIncrease(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.5"
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
            <label htmlFor="dateOfBirth" className="block text-xs font-medium text-gray-600 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              max={new Date().toISOString().split('T')[0]}
            />
            {dateOfBirth && typeof currentAge === 'number' && (
              <p className="mt-2 text-sm font-medium text-blue-600">Current Age: {currentAge} years</p>
            )}
            {dateOfBirth && monthsUntilBirthday > 0 && (
              <p className="mt-1 text-xs text-gray-500">Next birthday in {monthsUntilBirthday} months</p>
            )}
          </div>
          
          <div>
            <label htmlFor="targetAge" className="block text-xs font-medium text-gray-600 mb-2">
              Target Age
            </label>
            <input
              type="number"
              id="targetAge"
              min="19"
              max="150"
              value={targetAge}
              onChange={(e) => setTargetAge(e.target.value === '' ? '' : parseInt(e.target.value) || 65)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="65"
            />
            <p className="mt-1 text-xs text-gray-500">Greater than current age</p>
          </div>
        </div>

        {typeof targetAge === 'number' && typeof currentAge === 'number' && targetAge > currentAge && (
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-900">
            Time horizon: <strong>{targetAge - currentAge} years</strong>
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
        disabled={!isFormValid()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
      >
        Calculate Portfolio Growth
      </button>
    </form>
  );
};

export default InputForm;
