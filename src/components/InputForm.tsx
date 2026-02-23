import React, { useState, useMemo } from 'react';
import { AccountInput as AccountInputType, PortfolioInputs, HouseDepositCalculation } from '../types';
import AccountInput from './AccountInput';
import { calculateHouseMetrics } from '../utils/houseCalculations';

interface InputFormProps {
  onCalculate: (inputs: PortfolioInputs) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onCalculate }) => {
  const [accounts, setAccounts] = useState<AccountInputType[]>([
    { name: 'Savings', currentBalance: 10000, monthlyContribution: 10, expectedReturn: 2, isSalaryPercentage: true, bonusContributionPercent: 10 },
    { 
      name: 'Pension', 
      currentBalance: 27500, 
      monthlyContribution: 0, // will be determined by age bracket
      expectedReturn: 7, 
      isSalaryPercentage: true,
      employerContributionPercent: 8,
      bonusContributionPercent: -1, // Special flag: -1 means checkbox enabled (use age bracket percentages)
      ageBracketContributions: {
        under30: 15,
        age30to39: 20,
        age40to49: 25,
        age50to54: 30,
        age55to59: 35,
        age60plus: 40,
      }
    },
    { name: 'Brokerage', currentBalance: 20000, monthlyContribution: 35, expectedReturn: 8, isSalaryPercentage: true, bonusContributionPercent: 80 },
  ]);

  const [dateOfBirth, setDateOfBirth] = useState<string>('1997-10-03'); // Default to my date of birth
  const [targetAge, setTargetAge] = useState<number | ''>(75);
  const [currentSalary, setCurrentSalary] = useState<number | ''>(70000);
  const [annualSalaryIncrease, setAnnualSalaryIncrease] = useState<number | ''>(3);
  const [bonusPercent, setBonusPercent] = useState<number | ''>(15);
  const [pensionAge, setPensionAge] = useState<number | ''>(61);
  const [withdrawalRate, setWithdrawalRate] = useState<number | ''>(4);
  const [earlyRetirementAge, setEarlyRetirementAge] = useState<number | ''>(50);
  const [salaryReplacementRate, setSalaryReplacementRate] = useState<number | ''>(80);
  const [lumpSumToBrokerageRate, setLumpSumToBrokerageRate] = useState<number | ''>(100);
  const [enablePensionLumpSum, setEnablePensionLumpSum] = useState<boolean>(true);
  const [pensionLumpSumAge, setPensionLumpSumAge] = useState<number | ''>(50);
  const [houseWithdrawalAge, setHouseWithdrawalAge] = useState<number | ''>(34);
  const [enableHouseWithdrawal, setEnableHouseWithdrawal] = useState<boolean>(true);
  const [houseDepositFromBrokerageRate, setHouseDepositFromBrokerageRate] = useState<number | ''>(80);
  const [mortgageExemption, setMortgageExemption] = useState<boolean>(true);
  
  // House price configuration - these could be made configurable via advanced options in the future
  const baseHousePrice = 387000; // EUR
  const houseAnnualPriceIncrease = 7; // percentage
  
  // Tax Calculation State
  const [taxBikValue, setTaxBikValue] = useState<number | ''>(1700);
  
  const [errors, setErrors] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

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

  // Calculate house deposit metrics when house age or salary changes
  const houseDepositMetrics: HouseDepositCalculation | null = useMemo(() => {
    if (!enableHouseWithdrawal || typeof currentAge !== 'number' || typeof houseWithdrawalAge !== 'number') {
      return null;
    }
    
    const salary = typeof currentSalary === 'number' ? currentSalary : (currentSalary === '' ? 0 : parseFloat(currentSalary));
    const bonus = typeof bonusPercent === 'number' ? bonusPercent : (bonusPercent === '' ? 0 : parseFloat(bonusPercent));
    const increase = typeof annualSalaryIncrease === 'number' ? annualSalaryIncrease : (annualSalaryIncrease === '' ? 0 : parseFloat(annualSalaryIncrease));
    
    // Project salary and bonus at the house purchase age
    const yearsUntilPurchase = houseWithdrawalAge - currentAge;
    const projectedSalary = salary * Math.pow(1 + (increase / 100), yearsUntilPurchase);
    const projectedBonus = projectedSalary * (bonus / 100);
    
    return calculateHouseMetrics(
      houseWithdrawalAge,
      currentAge,
      projectedSalary,
      projectedBonus,
      baseHousePrice,
      houseAnnualPriceIncrease,
      mortgageExemption
    );
  }, [enableHouseWithdrawal, currentAge, houseWithdrawalAge, currentSalary, bonusPercent, annualSalaryIncrease, mortgageExemption]);

  // Helper function to get pension contribution percentage based on age brackets
  const getPensionPercentForAge = (age: number): number => {
    const pensionAccount = accounts.find(acc => acc.name === 'Pension');
    if (!pensionAccount || !pensionAccount.ageBracketContributions) {
      return 0;
    }
    const brackets = pensionAccount.ageBracketContributions;
    if (age < 30) return brackets.under30;
    if (age < 40) return brackets.age30to39;
    if (age < 50) return brackets.age40to49;
    if (age < 55) return brackets.age50to54;
    if (age < 60) return brackets.age55to59;
    return brackets.age60plus;
  };

  const currentPensionPercent = typeof currentAge === 'number' ? getPensionPercentForAge(currentAge) : 0;

  const handleAccountChange = (index: number, updatedAccount: AccountInputType) => {
    const newAccounts = [...accounts];
    newAccounts[index] = updatedAccount;
    setAccounts(newAccounts);
  };

  const isFormValid = (): boolean => {
    // Check if any field is empty
    if (dateOfBirth === '' || targetAge === '' || currentSalary === '' || annualSalaryIncrease === '' || pensionAge === '' || withdrawalRate === '' || earlyRetirementAge === '' || salaryReplacementRate === '' || lumpSumToBrokerageRate === '' || pensionLumpSumAge === '' || houseWithdrawalAge === '' || houseDepositFromBrokerageRate === '') {
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
    const brokerageRate = typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : parseFloat(lumpSumToBrokerageRate as string);
    const lumpSumAge = typeof pensionLumpSumAge === 'number' ? pensionLumpSumAge : parseInt(pensionLumpSumAge as string);
    const houseAge = typeof houseWithdrawalAge === 'number' ? houseWithdrawalAge : parseInt(houseWithdrawalAge);
    const houseBrokerageRate = typeof houseDepositFromBrokerageRate === 'number' ? houseDepositFromBrokerageRate : parseFloat(houseDepositFromBrokerageRate);

    // Check for NaN
    if (isNaN(age) || isNaN(future) || isNaN(salary) || isNaN(increase) || isNaN(pension) || isNaN(withdrawal) || isNaN(earlyRetirement) || isNaN(replacement) || isNaN(brokerageRate) || isNaN(lumpSumAge) || isNaN(houseAge) || isNaN(houseBrokerageRate)) {
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
    if (brokerageRate < 0 || brokerageRate > 100) return false;
    if (lumpSumAge < 50 || lumpSumAge > pension) return false;
    if (houseAge < 18 || houseAge > 100) return false;
    if (houseBrokerageRate < 0 || houseBrokerageRate > 100) return false;

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
    const bonus = typeof bonusPercent === 'number' ? bonusPercent : parseFloat(bonusPercent as string);
    const pension = typeof pensionAge === 'number' ? pensionAge : parseInt(pensionAge as string);
    const withdrawal = typeof withdrawalRate === 'number' ? withdrawalRate : parseFloat(withdrawalRate as string);
    const earlyRetirement = typeof earlyRetirementAge === 'number' ? earlyRetirementAge : parseInt(earlyRetirementAge as string);
    const replacement = typeof salaryReplacementRate === 'number' ? salaryReplacementRate : parseFloat(salaryReplacementRate as string);
    const brokerageRate = typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : parseFloat(lumpSumToBrokerageRate as string);
    const lumpSumAge = typeof pensionLumpSumAge === 'number' ? pensionLumpSumAge : parseInt(pensionLumpSumAge as string);
    const houseAge = typeof houseWithdrawalAge === 'number' ? houseWithdrawalAge : parseInt(houseWithdrawalAge);
    const houseBrokerageRate = typeof houseDepositFromBrokerageRate === 'number' ? houseDepositFromBrokerageRate : parseFloat(houseDepositFromBrokerageRate);

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
    if (enablePensionLumpSum && (lumpSumAge < 50 || lumpSumAge > pension)) {
      newErrors.push('Pension lump sum age must be between 50 and your pension age');
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
    if (brokerageRate < 0 || brokerageRate > 100) {
      newErrors.push('Lump sum brokerage allocation must be between 0% and 100%');
    }
    if (enableHouseWithdrawal) {
      if (houseAge < 18 || houseAge > 100) {
        newErrors.push('House withdrawal age must be between 18 and 100');
      }
      if (houseBrokerageRate < 0 || houseBrokerageRate > 100) {
        newErrors.push('House deposit brokerage allocation must be between 0% and 100%');
      }
    }

    // Tax validation
    const taxBik = typeof taxBikValue === 'number' ? taxBikValue : parseInt(taxBikValue as string);
    
    if (isNaN(taxBik) || taxBik < 0) {
      newErrors.push('BIK value must be a valid number');
    }

    setErrors(newErrors);

    if (newErrors.length === 0) {
      const taxInputData = {
        grossSalary: salary,
        pensionContribution: (salary * currentPensionPercent) / 100,
        bikValue: typeof taxBikValue === 'number' ? taxBikValue : parseInt(taxBikValue as string) || 0,
      };

      const lumpSumAge = typeof pensionLumpSumAge === 'number' ? pensionLumpSumAge : parseInt(pensionLumpSumAge as string);
      
      onCalculate({
        accounts,
        dateOfBirth: new Date(dateOfBirth),
        currentAge: age,
        targetAge: future,
        currentSalary: salary,
        annualSalaryIncrease: increase,
        monthsUntilNextBirthday: monthsUntilBirthday,
        bonusPercent: bonus,
        pensionAge: pension,
        withdrawalRate: withdrawal,
        earlyRetirementAge: earlyRetirement,
        salaryReplacementRate: replacement,
        lumpSumToBrokerageRate: brokerageRate,
        enablePensionLumpSum: enablePensionLumpSum,
        pensionLumpSumAge: lumpSumAge,
        houseWithdrawalAge: houseAge,
        enableHouseWithdrawal: enableHouseWithdrawal,
        baseHousePrice: baseHousePrice,
        houseAnnualPriceIncrease: houseAnnualPriceIncrease,
        houseDepositFromBrokerageRate: houseBrokerageRate,
        houseDepositCalculation: houseDepositMetrics || undefined,
        mortgageExemption: mortgageExemption,
        taxInputs: taxInputData,
        enableTaxCalculation: true,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">👤</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Your Details</h2>
            <p className="text-sm text-gray-600">Your age and how long you want to plan ahead</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="dateOfBirth" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              max={new Date().toISOString().split('T')[0]}
            />
            {dateOfBirth && monthsUntilBirthday > 0 && (
              <p className="mt-2 text-xs text-gray-600">Next birthday in {monthsUntilBirthday} months</p>
            )}
            {dateOfBirth && typeof currentAge === 'number' && (
              <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <p className="text-sm font-bold text-indigo-900">Current Age: {currentAge} years</p>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="targetAge" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Plan Until Age
            </label>
            <input
              type="number"
              id="targetAge"
              min="19"
              max="150"
              value={targetAge}
              onChange={(e) => setTargetAge(e.target.value === '' ? '' : parseInt(e.target.value) || 80)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              placeholder="80"
            />
            <p className="mt-2 text-xs text-gray-600">How far ahead should we calculate?</p>
            {typeof targetAge === 'number' && typeof currentAge === 'number' && targetAge > currentAge && (
              <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                <p className="text-sm font-bold text-indigo-900">Time Horizon: {targetAge - currentAge} years</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Income Information Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">💵</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Your Income</h2>
            <p className="text-sm text-gray-600">Salary, raises, and bonuses</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label htmlFor="currentSalary" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Current Annual Salary
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-green-600 font-bold">€</span>
              <input
                type="number"
                id="currentSalary"
                min="0"
                step="1000"
                value={currentSalary}
                onChange={(e) => setCurrentSalary(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                placeholder="70000"
              />
            </div>
            <p className="mt-2 text-xs text-gray-600">Your gross income (before taxes)</p>
          </div>
          
          <div>
            <label htmlFor="salaryIncrease" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Average Annual Raise
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
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                placeholder="2"
              />
              <span className="absolute right-4 top-3.5 text-gray-600 font-semibold">%</span>
            </div>
            <p className="mt-2 text-xs text-gray-600">Year-on-year salary growth</p>
          </div>

          <div>
            <label htmlFor="bonusPercent" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Annual Bonus <span className="font-normal text-gray-600">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="bonusPercent"
                min="0"
                max="100"
                step="0.1"
                value={bonusPercent}
                onChange={(e) => setBonusPercent(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                placeholder="15"
              />
              <span className="absolute right-4 top-3.5 text-gray-600 font-semibold">%</span>
            </div>
            <p className="mt-2 text-xs text-gray-600">As % of gross salary</p>
          </div>

          <div>
            <label htmlFor="bikValue" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Non-Cash Benefits
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-green-600 font-bold">€</span>
              <input
                type="number"
                id="bikValue"
                min="0"
                step="100"
                value={taxBikValue}
                onChange={(e) => setTaxBikValue(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                placeholder="1700"
              />
            </div>
            <p className="mt-2 text-xs text-gray-600">Health insurance, company car, etc.</p>
          </div>
        </div>
      </div>

      {/* Investment Accounts Section */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">📊</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Your Investments</h2>
            <p className="text-sm text-gray-600">How much in savings, pension, and brokerage accounts</p>
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
      </div>

      {/* Retirement Planning Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🎯</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Retirement Planning</h2>
            <p className="text-sm text-gray-600">Define your retirement milestones</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="earlyRetirementAge" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              When Could You Retire Early?
            </label>
            <input
              type="number"
              id="earlyRetirementAge"
              min="18"
              max="100"
              value={earlyRetirementAge}
              onChange={(e) => setEarlyRetirementAge(e.target.value === '' ? '' : parseInt(e.target.value) || 50)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              placeholder="48"
            />
            <p className="mt-2 text-xs text-gray-600">Age you could start living off investments</p>
          </div>

          <div>
            <label htmlFor="pensionAge" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Pension Drawdown Age?
            </label>
            <input
              type="number"
              id="pensionAge"
              min="18"
              max="100"
              value={pensionAge}
              onChange={(e) => setPensionAge(e.target.value === '' ? '' : parseInt(e.target.value) || 66)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              placeholder="66"
            />
            <p className="mt-2 text-xs text-gray-600">Age you want to start drawing down your pension at</p>
          </div>
        </div>
      </div>

      {/* Withdrawal Strategy Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">💳</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Retirement Income</h2>
            <p className="text-sm text-gray-600">How you'll withdraw money when you stop working</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
          <div>
            <label htmlFor="salaryReplacementRate" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Income During Early Retirement
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
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                placeholder="80"
              />
              <span className="absolute right-4 top-3.5 text-gray-600 font-semibold">%</span>
            </div>
            <p className="mt-2 text-xs text-gray-600">What % of your final gross salary do you want to live on?</p>
          </div>
          
          <div>
            <label htmlFor="withdrawalRate" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Annual Pension Withdrawal
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
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                placeholder="4"
              />
              <span className="absolute right-4 top-3.5 text-gray-600 font-semibold">%</span>
            </div>
            <p className="mt-2 text-xs text-gray-600">What % of your pension balance to withdraw each year?</p>
          </div>
        </div>


      </div>

      {/* Advanced Options Section (Collapsible) */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <button
          type="button"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="w-full flex items-center justify-between mb-6 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center group-hover:from-slate-600 group-hover:to-slate-700 transition-all duration-200">
              <span className="text-white text-lg">⚙️</span>
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900">More Options</h2>
              <p className="text-sm text-gray-600">Pension lump sum & house purchase</p>
            </div>
          </div>
          <span className={`text-gray-400 transition-transform duration-300 ${showAdvancedOptions ? 'rotate-180' : ''} text-2xl`}>
            ▼
          </span>
        </button>

        {showAdvancedOptions && (
          <div className="space-y-7 border-t border-gray-200 pt-7">
            {/* Pension Lump Sum Section */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-lg">💰</span>
                <h3 className="text-lg font-bold text-gray-900">Pension Tax-Free Lump Sum</h3>
              </div>
              
              <div className="space-y-5">
                <label className="flex items-start gap-4 cursor-pointer p-4 rounded-lg hover:bg-slate-50 transition-colors duration-200 border border-gray-200">
                  <input
                    type="checkbox"
                    checked={enablePensionLumpSum}
                    onChange={(e) => setEnablePensionLumpSum(e.target.checked)}
                    className="mt-1 w-5 h-5 text-slate-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-slate-500 cursor-pointer accent-current"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Take 25% tax-free at a chosen age</p>
                    <p className="text-xs text-gray-600 mt-1">You can withdraw 25% of your pension tax-free (up to €200,000), leaving the rest to grow</p>
                  </div>
                </label>

                {enablePensionLumpSum && (
                  <div className="mt-6 pt-6 border-t-2 border-gray-100 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="pensionLumpSumAge" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                          Age for Lump Sum
                        </label>
                        <input
                          type="number"
                          id="pensionLumpSumAge"
                          min="50"
                          max={typeof pensionAge === 'number' ? pensionAge : 100}
                          value={pensionLumpSumAge}
                          onChange={(e) => setPensionLumpSumAge(e.target.value === '' ? '' : parseInt(e.target.value) || 50)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                          placeholder="50"
                        />
                        <p className="mt-2 text-xs text-gray-600">You'll take the 25% lump sum in January of this year (minimum 50, maximum your pension age)</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                          Lump Sum Allocation
                        </label>
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Brokerage</p>
                              <p className="text-2xl font-bold text-emerald-600">{typeof lumpSumToBrokerageRate === 'number' ? Math.round(lumpSumToBrokerageRate) : 80}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Savings</p>
                              <p className="text-2xl font-bold text-blue-600">{typeof lumpSumToBrokerageRate === 'number' ? Math.round(100 - lumpSumToBrokerageRate) : 20}%</p>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : 80}
                            onChange={(e) => setLumpSumToBrokerageRate(parseInt(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-slate-400"
                            style={{
                              background: `linear-gradient(to right, rgb(16, 185, 129) 0%, rgb(16, 185, 129) ${typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : 80}%, rgb(59, 130, 246) ${typeof lumpSumToBrokerageRate === 'number' ? lumpSumToBrokerageRate : 80}%, rgb(59, 130, 246) 100%)`
                            }}
                            aria-label="Lump sum brokerage allocation"
                          />
                        </div>
                        <p className="mt-3 text-xs text-gray-600">Drag to adjust allocation</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* House Purchase Section */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-lg">🏠</span>
                <h3 className="text-lg font-bold text-gray-900">House Purchase</h3>
              </div>
              
              <div className="space-y-5">
                <label className="flex items-start gap-4 cursor-pointer p-4 rounded-lg hover:bg-slate-50 transition-colors duration-200 border border-gray-200">
                  <input
                    type="checkbox"
                    checked={enableHouseWithdrawal}
                    onChange={(e) => setEnableHouseWithdrawal(e.target.checked)}
                    className="mt-1 w-5 h-5 text-slate-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-slate-500 cursor-pointer accent-current"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Plan a house purchase</p>
                    <p className="text-xs text-gray-600 mt-1">Set aside money for a house down payment at a certain age</p>
                  </div>
                </label>

                {enableHouseWithdrawal && (
                  <div className="mt-6 pt-6 border-t-2 border-gray-100 space-y-6">
                    <label className="flex items-start gap-4 cursor-pointer p-4 rounded-lg hover:bg-slate-50 transition-colors duration-200 border border-gray-200">
                      <input
                        type="checkbox"
                        checked={mortgageExemption}
                        onChange={(e) => setMortgageExemption(e.target.checked)}
                        className="mt-1 w-5 h-5 text-slate-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-slate-500 cursor-pointer accent-current"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Mortgage Exemption</p>
                        <p className="text-xs text-gray-600 mt-1">If applicable, increases your borrowing capacity from salary×4 to (salary + bonus÷2)×4.5</p>
                      </div>
                    </label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="houseWithdrawalAge" className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                          Purchase Age
                        </label>
                        <input
                          type="number"
                          id="houseWithdrawalAge"
                          min={typeof currentAge === 'number' ? currentAge : '18'}
                          max="100"
                          value={houseWithdrawalAge}
                          onChange={(e) => setHouseWithdrawalAge(e.target.value === '' ? '' : parseInt(e.target.value) || 34)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                          placeholder="34"
                        />
                        <p className="mt-2 text-xs text-gray-600">We'll set aside money in January of this year</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                          Account WIthdrawal Allocation
                        </label>
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Brokerage</p>
                              <p className="text-lg font-bold text-emerald-600">{typeof houseDepositFromBrokerageRate === 'number' ? Math.round(houseDepositFromBrokerageRate) : 50}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Savings</p>
                              <p className="text-lg font-bold text-blue-600">{typeof houseDepositFromBrokerageRate === 'number' ? Math.round(100 - houseDepositFromBrokerageRate) : 50}%</p>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={typeof houseDepositFromBrokerageRate === 'number' ? houseDepositFromBrokerageRate : 50}
                            onChange={(e) => setHouseDepositFromBrokerageRate(parseInt(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-slate-400"
                            style={{
                              background: `linear-gradient(to right, rgb(16, 185, 129) 0%, rgb(16, 185, 129) ${typeof houseDepositFromBrokerageRate === 'number' ? houseDepositFromBrokerageRate : 50}%, rgb(59, 130, 246) ${typeof houseDepositFromBrokerageRate === 'number' ? houseDepositFromBrokerageRate : 50}%, rgb(59, 130, 246) 100%)`
                            }}
                            aria-label="House deposit brokerage allocation"
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-600">Drag to adjust allocation</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="p-6 bg-red-50 rounded-2xl border-2 border-red-200 shadow-lg">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-red-900">Please Fix These Issues</h3>
              <p className="text-sm text-red-800 mt-1">We found {errors.length} {errors.length === 1 ? 'issue' : 'issues'}:</p>
            </div>
          </div>
          <ul className="space-y-2 mt-3">
            {errors.map((error, idx) => (
              <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                <span className="font-bold text-red-600 mt-0.5">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid()}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed disabled:hover:from-gray-400 disabled:hover:to-gray-400 text-white font-bold py-4 px-6 rounded-xl transition duration-200 shadow-lg hover:shadow-xl disabled:shadow-none text-lg"
      >
        See My Projections
      </button>
    </form>
  );
};

export default InputForm;
