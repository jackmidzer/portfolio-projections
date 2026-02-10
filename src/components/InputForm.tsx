import React, { useState } from 'react';
import { AccountInput as AccountInputType, PortfolioInputs } from '../types';
import AccountInput from './AccountInput';

interface InputFormProps {
  onCalculate: (inputs: PortfolioInputs) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onCalculate }) => {
  const [accounts, setAccounts] = useState<AccountInputType[]>([
    { name: 'Savings', currentBalance: 10000, monthlyContribution: 8.5, expectedReturn: 2, isSalaryPercentage: true },
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
    { name: 'Brokerage', currentBalance: 20000, monthlyContribution: 21.5, expectedReturn: 8, isSalaryPercentage: true },
  ]);

  const [dateOfBirth, setDateOfBirth] = useState<string>('1997-10-03'); // Default to my date of birth
  const [targetAge, setTargetAge] = useState<number | ''>(80);
  const [currentSalary, setCurrentSalary] = useState<number | ''>(70000);
  const [annualSalaryIncrease, setAnnualSalaryIncrease] = useState<number | ''>(2);
  const [pensionAge, setPensionAge] = useState<number | ''>(66);
  const [withdrawalRate, setWithdrawalRate] = useState<number | ''>(4);
  const [earlyRetirementAge, setEarlyRetirementAge] = useState<number | ''>(50);
  const [salaryReplacementRate, setSalaryReplacementRate] = useState<number | ''>(80);
  const [pensionLumpSumAge, setPensionLumpSumAge] = useState<number | ''>(50);
  const [lumpSumToBrokerageRate, setLumpSumToBrokerageRate] = useState<number | ''>(80);
  const [useSalaryReplacementForPension, setUseSalaryReplacementForPension] = useState<boolean>(true);
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
    if (dateOfBirth === '' || targetAge === '' || currentSalary === '' || annualSalaryIncrease === '' || pensionAge === '' || withdrawalRate === '' || earlyRetirementAge === '' || salaryReplacementRate === '' || pensionLumpSumAge === '' || lumpSumToBrokerageRate === '') {
      return false;
    }

    // Convert to numbers for validation
    const age = typeof currentAge === 'number' ? currentAge : parseInt(currentAge as string);
    const future = typeof targetAge === 'number' ? targetAge : parseInt(targetAge);
    const salary = typeof currentSalary === 'number' ? currentSalary : parseInt(currentSalary);
    const increase = typeof annualSalaryIncrease === 'number' ? annualSalaryIncrease : parseInt(annualSalaryIncrease);
    const pension = typeof pensionAge === 'number' ? pensionAge : parseInt(pensionAge as string);
    const withdrawal = typeof withdrawalRate === 'number' ? withdrawalRate : parseFloat(withdrawalRate as string);
    const earlyRetirement = typeof earlyRetirementAge === 'number' ? earlyRetirementAge : parseInt(earlyRetirementAge as string);
    const replacement = typeof salaryReplacementRate === 'number' ? salaryReplacementRate : parseFloat(salaryReplacementRate as string);
    const lumpSumAge = typeof pensionLumpSumAge === 'number' ? pensionLumpSumAge : parseInt(pensionLumpSumAge as string);
    const brokerageRate = typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : parseFloat(lumpSumToBrokerageRate as string);

    // Check for NaN
    if (isNaN(age) || isNaN(future) || isNaN(salary) || isNaN(increase) || isNaN(pension) || isNaN(withdrawal) || isNaN(earlyRetirement) || isNaN(replacement) || isNaN(lumpSumAge) || isNaN(brokerageRate)) {
      return false;
    }

    // Check all validation conditions
    if (age < 18 || age > 100) return false;
    if (future <= age || future > 150) return false;
    if (salary <= 0) return false;
    if (increase < 0 || increase > 20) return false;
    if (pension < 18 || pension > 100) return false;
    if (withdrawal <= 0 || withdrawal > 20) return false;
    if (earlyRetirement < 18 || earlyRetirement > 100) return false;
    if (replacement <= 0 || replacement > 100) return false;
    if (lumpSumAge < 50 || lumpSumAge > 100) return false;
    if (brokerageRate < 0 || brokerageRate > 100) return false;

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
    const pension = typeof pensionAge === 'number' ? pensionAge : parseInt(pensionAge as string);
    const withdrawal = typeof withdrawalRate === 'number' ? withdrawalRate : parseFloat(withdrawalRate as string);
    const earlyRetirement = typeof earlyRetirementAge === 'number' ? earlyRetirementAge : parseInt(earlyRetirementAge as string);
    const replacement = typeof salaryReplacementRate === 'number' ? salaryReplacementRate : parseFloat(salaryReplacementRate as string);
    const lumpSumAge = typeof pensionLumpSumAge === 'number' ? pensionLumpSumAge : parseInt(pensionLumpSumAge as string);
    const brokerageRate = typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : parseFloat(lumpSumToBrokerageRate as string);

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
    if (pension < 18 || pension > 100) {
      newErrors.push('Pension age must be between 18 and 100');
    }
    if (withdrawal <= 0 || withdrawal > 20) {
      newErrors.push('Withdrawal rate must be between 0% and 20%');
    }
    if (earlyRetirement < 18 || earlyRetirement > 100) {
      newErrors.push('Early retirement age must be between 18 and 100');
    }
    if (replacement <= 0 || replacement > 100) {
      newErrors.push('Salary replacement rate must be between 0% and 100%');
    }
    if (lumpSumAge < 50 || lumpSumAge > 100) {
      newErrors.push('Pension lump sum age must be between 50 and 100');
    }
    if (brokerageRate < 0 || brokerageRate > 100) {
      newErrors.push('Lump sum brokerage allocation must be between 0% and 100%');
    }

    setErrors(newErrors);

    if (newErrors.length === 0) {
      onCalculate({ accounts, dateOfBirth: new Date(dateOfBirth), currentAge: age, targetAge: future, currentSalary: salary, annualSalaryIncrease: increase, monthsUntilNextBirthday: monthsUntilBirthday, pensionAge: pension, withdrawalRate: withdrawal, earlyRetirementAge: earlyRetirement, salaryReplacementRate: replacement, pensionLumpSumAge: lumpSumAge, lumpSumToBrokerageRate: brokerageRate, useSalaryReplacementForPension: useSalaryReplacementForPension });
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

      {/* Age & Timeline Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Age & Timeline
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              onChange={(e) => setTargetAge(e.target.value === '' ? '' : parseInt(e.target.value) || 80)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="80"
            />
            <p className="mt-1 text-xs text-gray-500">Greater than current age</p>
          </div>
        </div>
        {typeof targetAge === 'number' && typeof currentAge === 'number' && targetAge > currentAge && (
          <div className="p-3 bg-blue-50 rounded text-sm text-blue-900">
            Time horizon: <strong>{targetAge - currentAge} years</strong>
          </div>
        )}
      </div>

      {/* Retirement Timeline Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Retirement Timeline
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="earlyRetirementAge" className="block text-xs font-medium text-gray-600 mb-2">
              Early Retirement Age
            </label>
            <input
              type="number"
              id="earlyRetirementAge"
              min="18"
              max="100"
              value={earlyRetirementAge}
              onChange={(e) => setEarlyRetirementAge(e.target.value === '' ? '' : parseInt(e.target.value) || 50)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="50"
            />
            <p className="mt-1 text-xs text-gray-500">Age when you can start withdrawing from brokerage account</p>
          </div>

          <div>
            <label htmlFor="pensionAge" className="block text-xs font-medium text-gray-600 mb-2">
              Pension Age
            </label>
            <input
              type="number"
              id="pensionAge"
              min="18"
              max="100"
              value={pensionAge}
              onChange={(e) => setPensionAge(e.target.value === '' ? '' : parseInt(e.target.value) || 66)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="66"
            />
            <p className="mt-1 text-xs text-gray-500">Age when you can withdraw from pension</p>
          </div>
        </div>
      </div>

      {/* Withdrawal Strategy Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Withdrawal Strategy
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="salaryReplacementRate" className="block text-xs font-medium text-gray-600 mb-2">
              Salary Replacement Rate
            </label>
            <div className="relative">
              <input
                type="number"
                id="salaryReplacementRate"
                min="0"
                max="100"
                step="0.1"
                value={salaryReplacementRate}
                onChange={(e) => setSalaryReplacementRate(e.target.value === '' ? '' : parseFloat(e.target.value) || 80)}
                className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="80"
              />
              <span className="absolute right-3 top-2.5 text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Percentage of final salary to withdraw annually during early retirement</p>
          </div>
          
          <div>
            <label htmlFor="withdrawalRate" className="block text-xs font-medium text-gray-600 mb-2">
              Annual Withdrawal Rate
            </label>
            <div className="relative">
              <input
                type="number"
                id="withdrawalRate"
                min="0"
                max="20"
                step="0.1"
                value={withdrawalRate}
                onChange={(e) => setWithdrawalRate(e.target.value === '' ? '' : parseFloat(e.target.value) || 4)}
                className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="4"
              />
              <span className="absolute right-3 top-2.5 text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Annual withdrawal percentage from pension account</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Pension Withdrawal Method
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="pensionWithdrawalMethod"
                checked={!useSalaryReplacementForPension}
                onChange={() => setUseSalaryReplacementForPension(false)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Withdrawal Rate ({withdrawalRate}% Rule)</p>
                <p className="text-xs text-gray-500">Withdraw {withdrawalRate}% of pension balance annually</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="pensionWithdrawalMethod"
                checked={useSalaryReplacementForPension}
                onChange={() => setUseSalaryReplacementForPension(true)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Salary Replacement ({salaryReplacementRate}%)</p>
                <p className="text-xs text-gray-500">Use {salaryReplacementRate}% of hypothetical salary, continuing to grow annually</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Pension Lump Sum Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Pension Lump Sum
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pensionLumpSumAge" className="block text-xs font-medium text-gray-600 mb-2">
              Lump Sum Withdrawal Age
            </label>
            <input
              type="number"
              id="pensionLumpSumAge"
              min="50"
              max="100"
              value={pensionLumpSumAge}
              onChange={(e) => setPensionLumpSumAge(e.target.value === '' ? '' : parseInt(e.target.value) || 50)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="50"
            />
            <p className="mt-1 text-xs text-gray-500">Age to withdraw 25% of pension (capped at €200,000)</p>
          </div>

          <div>
            <label htmlFor="lumpSumToBrokerageRate" className="block text-xs font-medium text-gray-600 mb-4">
              Allocation
            </label>
            <div className="space-y-4">
              {/* Slider with labels */}
              <div className="flex items-end gap-3">
                <div className="flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Brokerage</p>
                  <p className="text-xl font-bold text-emerald-600">{typeof lumpSumToBrokerageRate === 'number' ? Math.round(lumpSumToBrokerageRate) : 80}%</p>
                </div>
                <input
                  type="range"
                  id="lumpSumToBrokerageRate"
                  min="0"
                  max="100"
                  step="5"
                  value={typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : 80}
                  onChange={(e) => setLumpSumToBrokerageRate(parseFloat(e.target.value))}
                  className="flex-1 h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-600 slider"
                  style={{
                    background: `linear-gradient(to right, rgb(16, 185, 129) 0%, rgb(16, 185, 129) ${typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : 80}%, rgb(59, 130, 246) ${typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : 80}%, rgb(59, 130, 246) 100%)`
                  }}
                />
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Savings</p>
                  <p className="text-xl font-bold text-blue-600">{typeof lumpSumToBrokerageRate === 'number' ? Math.round(100 - lumpSumToBrokerageRate) : 20}%</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Drag to allocate your pension lump sum between brokerage and savings accounts</p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-red-50 rounded border border-red-200">
          {errors.map((error, idx) => (
            <p key={idx} className="text-sm text-red-700">
              • {error}
            </p>
          ))}
        </div>
      )}

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
