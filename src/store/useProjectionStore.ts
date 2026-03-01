import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AccountInput as AccountInputType, PortfolioResults, TaxCalculationResult, HouseDepositCalculation } from '@/types';
import { calculatePortfolioGrowth } from '@/utils/calculations';
import { calculateNetSalary, calculateBonusTaxBurden } from '@/utils/taxCalculations';
import { calculateHouseMetrics } from '@/utils/houseCalculations';
import { validateInputs } from '@/utils/validation';

// ─── Form Inputs Slice ───────────────────────────────────────────────

export interface FormInputs {
  // Personal
  dateOfBirth: string;
  targetAge: number | '';

  // Income
  currentSalary: number | '';
  annualSalaryIncrease: number | '';
  bonusPercent: number | '';
  taxBikValue: number | '';

  // Accounts
  accounts: AccountInputType[];

  // Retirement
  pensionAge: number | '';
  fireAge: number | '';
  withdrawalRate: number | '';
  salaryReplacementRate: number | '';
  enablePensionLumpSum: boolean;
  pensionLumpSumAge: number | '';
  pensionLumpSumMaxAmount: number | '';
  lumpSumToBrokerageRate: number | '';

  // House
  enableHouseWithdrawal: boolean;
  houseWithdrawalAge: number | '';
  houseDepositFromBrokerageRate: number | '';
  mortgageExemption: boolean;
  baseHousePrice: number;
  houseAnnualPriceIncrease: number;

  // State Pension
  includeStatePension: boolean;
  statePensionAge: number | '';
  statePensionWeeklyAmount: number | '';
}

// ─── UI State Slice ──────────────────────────────────────────────────

interface UIState {
  expandedSections: string[];
  showAdvancedOptions: boolean;
  isCalculating: boolean;
  validationErrors: Record<string, string>;
}

// ─── Results Slice ───────────────────────────────────────────────────

interface ResultsState {
  results: PortfolioResults | null;
  taxCalculationResult: TaxCalculationResult | null;
  bonusTaxBurden: number;
  lastCalculatedBonusPercent: number;
}

// ─── Combined Store ──────────────────────────────────────────────────

interface ProjectionStore extends FormInputs, UIState, ResultsState {
  // Form actions
  updateField: <K extends keyof FormInputs>(field: K, value: FormInputs[K]) => void;
  updateAccount: (index: number, account: AccountInputType) => void;
  resetForm: () => void;

  // UI actions
  toggleSection: (section: string) => void;
  setShowAdvancedOptions: (show: boolean) => void;
  setIsCalculating: (value: boolean) => void;

  // Calculation actions
  calculate: () => { errors: string[] };

  // Computed helpers
  getCurrentAge: () => number | '';
  getMonthsUntilBirthday: () => number;
  getHouseDepositMetrics: () => HouseDepositCalculation | null;
  getCurrentPensionPercent: () => number;
}

const defaultFormInputs: FormInputs = {
  dateOfBirth: '1997-10-03',
  targetAge: 75,
  currentSalary: 70000,
  annualSalaryIncrease: 3,
  bonusPercent: 15,
  taxBikValue: 1700,
  accounts: [
    { name: 'Savings', currentBalance: 10000, monthlyContribution: 10, expectedReturn: 2, isSalaryPercentage: true, bonusContributionPercent: 10 },
    {
      name: 'Pension',
      currentBalance: 27500,
      monthlyContribution: 0,
      expectedReturn: 7,
      isSalaryPercentage: true,
      employerAgeBracketContributions: {
        under25: 5,
        age25to29: 8,
        age30to34: 11,
        age35to39: 12,
        age40to44: 14,
        age45to49: 16,
        age50to54: 18,
        age55plus: 20,
      },
      bonusContributionPercent: 'age-bracket',
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
  ],
  pensionAge: 61,
  fireAge: 50,
  withdrawalRate: 4,
  salaryReplacementRate: 60,
  enablePensionLumpSum: true,
  pensionLumpSumAge: 50,
  pensionLumpSumMaxAmount: 200000,
  lumpSumToBrokerageRate: 100,
  enableHouseWithdrawal: true,
  houseWithdrawalAge: 32,
  houseDepositFromBrokerageRate: 80,
  mortgageExemption: true,
  baseHousePrice: 387000,
  houseAnnualPriceIncrease: 7,

  // State Pension
  includeStatePension: true,
  statePensionAge: 66,
  statePensionWeeklyAmount: 299.30,
};

// ─── Helper Functions ────────────────────────────────────────────────

function calculateAgeFromDOB(dob: string): number {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function calculateMonthsUntilBirthday(dob: string): number {
  const today = new Date();
  const birthDate = new Date(dob);
  const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday < today) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  }
  const monthsLeft = (nextBirthday.getFullYear() - today.getFullYear()) * 12 + (nextBirthday.getMonth() - today.getMonth());
  return monthsLeft;
}

function getPensionPercentForAge(age: number, accounts: AccountInputType[]): number {
  const pensionAccount = accounts.find(acc => acc.name === 'Pension');
  if (!pensionAccount || !pensionAccount.ageBracketContributions) return 0;
  const brackets = pensionAccount.ageBracketContributions;
  if (age < 30) return brackets.under30;
  if (age < 40) return brackets.age30to39;
  if (age < 50) return brackets.age40to49;
  if (age < 55) return brackets.age50to54;
  if (age < 60) return brackets.age55to59;
  return brackets.age60plus;
}

// ─── Persistence key ─────────────────────────────────────────────────

const STORAGE_KEY = 'portfolio-projections-storage';

// ─── Store ───────────────────────────────────────────────────────────

export const useProjectionStore = create<ProjectionStore>()(
  persist(
    (set, get) => ({
  // Default form inputs
  ...defaultFormInputs,

  // Default UI state
  expandedSections: ['personal', 'income', 'accounts'],
  showAdvancedOptions: false,
  isCalculating: false,
  validationErrors: {},

  // Default results
  results: null,
  taxCalculationResult: null,
  bonusTaxBurden: 0,
  lastCalculatedBonusPercent: 0,

  // ─── Form Actions ──────────────────────────────────────────────
  updateField: (field, value) => set(state => {
    const updated = { ...state, [field]: value };
    return { [field]: value, validationErrors: validateInputs(updated) };
  }),

  updateAccount: (index, account) => set(state => {
    const newAccounts = [...state.accounts];
    newAccounts[index] = account;
    const updated = { ...state, accounts: newAccounts };
    return { accounts: newAccounts, validationErrors: validateInputs(updated) };
  }),

  resetForm: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      ...defaultFormInputs,
      results: null,
      taxCalculationResult: null,
      bonusTaxBurden: 0,
      lastCalculatedBonusPercent: 0,
    });
  },

  // ─── UI Actions ────────────────────────────────────────────────
  toggleSection: (section) => set(state => {
    const sections = state.expandedSections;
    return {
      expandedSections: sections.includes(section)
        ? sections.filter(s => s !== section)
        : [...sections, section],
    };
  }),
  setShowAdvancedOptions: (show) => set({ showAdvancedOptions: show }),
  setIsCalculating: (value) => set({ isCalculating: value }),

  // ─── Computed Helpers ──────────────────────────────────────────
  getCurrentAge: () => {
    const { dateOfBirth } = get();
    return dateOfBirth ? calculateAgeFromDOB(dateOfBirth) : '';
  },

  getMonthsUntilBirthday: () => {
    const { dateOfBirth } = get();
    return dateOfBirth ? calculateMonthsUntilBirthday(dateOfBirth) : 0;
  },

  getHouseDepositMetrics: () => {
    const state = get();
    const currentAge = state.getCurrentAge();
    if (!state.enableHouseWithdrawal || typeof currentAge !== 'number' || typeof state.houseWithdrawalAge !== 'number') {
      return null;
    }
    const salary = typeof state.currentSalary === 'number' ? state.currentSalary : 0;
    const bonus = typeof state.bonusPercent === 'number' ? state.bonusPercent : 0;
    const increase = typeof state.annualSalaryIncrease === 'number' ? state.annualSalaryIncrease : 0;
    const yearsUntilPurchase = state.houseWithdrawalAge - currentAge;
    const projectedSalary = salary * Math.pow(1 + (increase / 100), yearsUntilPurchase);
    const projectedBonus = projectedSalary * (bonus / 100);
    return calculateHouseMetrics(
      state.houseWithdrawalAge,
      currentAge,
      projectedSalary,
      projectedBonus,
      state.baseHousePrice,
      state.houseAnnualPriceIncrease,
      state.mortgageExemption
    );
  },

  getCurrentPensionPercent: () => {
    const state = get();
    const currentAge = state.getCurrentAge();
    return typeof currentAge === 'number' ? getPensionPercentForAge(currentAge, state.accounts) : 0;
  },

  // ─── Calculation ───────────────────────────────────────────────
  calculate: () => {
    const state = get();
    const currentAge = state.getCurrentAge();
    const monthsUntilBirthday = state.getMonthsUntilBirthday();
    const houseDepositMetrics = state.getHouseDepositMetrics();
    const currentPensionPercent = state.getCurrentPensionPercent();

    const errors: string[] = [];

    // Parse values
    const age = typeof currentAge === 'number' ? currentAge : NaN;
    const future = typeof state.targetAge === 'number' ? state.targetAge : NaN;
    const salary = typeof state.currentSalary === 'number' ? state.currentSalary : NaN;
    const increase = typeof state.annualSalaryIncrease === 'number' ? state.annualSalaryIncrease : NaN;
    const bonus = typeof state.bonusPercent === 'number' ? state.bonusPercent : 0;
    const pension = typeof state.pensionAge === 'number' ? state.pensionAge : NaN;
    const withdrawal = typeof state.withdrawalRate === 'number' ? state.withdrawalRate : NaN;
    const fireAge = typeof state.fireAge === 'number' ? state.fireAge : NaN;
    const replacement = typeof state.salaryReplacementRate === 'number' ? state.salaryReplacementRate : NaN;
    const brokerageRate = typeof state.lumpSumToBrokerageRate === 'number' ? state.lumpSumToBrokerageRate : NaN;
    const lumpSumAge = typeof state.pensionLumpSumAge === 'number' ? state.pensionLumpSumAge : NaN;
    const lumpSumMaxAmount = typeof state.pensionLumpSumMaxAmount === 'number' ? state.pensionLumpSumMaxAmount : NaN;
    const houseAge = typeof state.houseWithdrawalAge === 'number' ? state.houseWithdrawalAge : NaN;
    const houseBrokerageRate = typeof state.houseDepositFromBrokerageRate === 'number' ? state.houseDepositFromBrokerageRate : NaN;

    // Validation
    if (!state.dateOfBirth) errors.push('Date of birth is required');
    if (isNaN(age) || age < 18 || age > 100) errors.push('Current age must be between 18 and 100');
    if (isNaN(future) || future <= age) errors.push('Target age must be greater than current age');
    if (future > 150) errors.push('Target age cannot exceed 150');
    if (isNaN(salary) || salary <= 0) errors.push('Current salary must be greater than 0');
    if (isNaN(increase) || increase < 0 || increase > 20) errors.push('Annual salary increase must be between 0% and 20%');
    if (isNaN(pension) || pension < 18 || pension > 100) errors.push('Pension age must be between 18 and 100');
    if (state.enablePensionLumpSum && (isNaN(lumpSumAge) || lumpSumAge < 50 || lumpSumAge > pension)) {
      errors.push('Pension lump sum age must be between 50 and your pension age');
    }
    if (state.enablePensionLumpSum && (isNaN(lumpSumMaxAmount) || lumpSumMaxAmount <= 0)) {
      errors.push('Pension lump sum max amount must be greater than 0');
    }
    if (isNaN(withdrawal) || withdrawal <= 0 || withdrawal > 20) errors.push('Withdrawal rate must be between 0% and 20%');
    if (isNaN(fireAge) || fireAge < 18 || fireAge > 100) errors.push('FIRE age must be between 18 and 100');
    if (!isNaN(fireAge) && !isNaN(pension) && fireAge > pension) errors.push('FIRE age must be ≤ pension drawdown age');
    if (isNaN(replacement) || replacement <= 0 || replacement > 100) errors.push('Salary replacement rate must be between 0% and 100%');
    if (isNaN(brokerageRate) || brokerageRate < 0 || brokerageRate > 100) errors.push('Lump sum brokerage allocation must be between 0% and 100%');
    if (state.enableHouseWithdrawal) {
      if (isNaN(houseAge) || houseAge < 18 || houseAge > 100) errors.push('House withdrawal age must be between 18 and 100');
      if (isNaN(houseBrokerageRate) || houseBrokerageRate < 0 || houseBrokerageRate > 100) errors.push('House deposit brokerage allocation must be between 0% and 100%');
    }

    if (errors.length > 0) {
      return { errors };
    }

    // Run calculation
    const timeHorizon = future - age + 1;
    const taxInputData = {
      grossSalary: salary,
      pensionContribution: (salary * currentPensionPercent) / 100,
      bikValue: typeof state.taxBikValue === 'number' ? state.taxBikValue : 0,
    };

    const calculatedResults = calculatePortfolioGrowth({
      accounts: state.accounts,
      timeHorizon,
      currentAge: age,
      currentSalary: salary,
      annualSalaryIncrease: increase,
      monthsUntilNextBirthday: monthsUntilBirthday,
      dateOfBirth: new Date(state.dateOfBirth),
      pensionAge: pension,
      withdrawalRate: withdrawal,
      fireAge,
      salaryReplacementRate: replacement,
      lumpSumToBrokerageRate: brokerageRate,
      bonusPercent: bonus,
      houseWithdrawalAge: houseAge,
      enableHouseWithdrawal: state.enableHouseWithdrawal,
      houseDepositCalculation: houseDepositMetrics || undefined,
      houseDepositFromBrokerageRate: houseBrokerageRate,
      enablePensionLumpSum: state.enablePensionLumpSum,
      taxInputs: taxInputData,
      pensionLumpSumAge: lumpSumAge,
      mortgageExemption: state.mortgageExemption,
      pensionLumpSumMaxAmount: lumpSumMaxAmount,
      includeStatePension: state.includeStatePension,
      statePensionAge: typeof state.statePensionAge === 'number' ? state.statePensionAge : 66,
      statePensionWeeklyAmount: typeof state.statePensionWeeklyAmount === 'number' ? state.statePensionWeeklyAmount : 299.30,
    });

    // Calculate tax
    let taxResult: TaxCalculationResult | null = null;
    let bonusTax = 0;
    taxResult = calculateNetSalary(taxInputData);
    if (bonus > 0) {
      bonusTax = calculateBonusTaxBurden(salary, bonus, currentPensionPercent, taxInputData.bikValue);
    }

    set({
      results: calculatedResults,
      taxCalculationResult: taxResult,
      bonusTaxBurden: bonusTax,
      lastCalculatedBonusPercent: bonus,
    });

    return { errors: [] };
  },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      migrate: (persisted, _version) => persisted as any,
      partialize: (state) => ({
        dateOfBirth: state.dateOfBirth,
        targetAge: state.targetAge,
        currentSalary: state.currentSalary,
        annualSalaryIncrease: state.annualSalaryIncrease,
        bonusPercent: state.bonusPercent,
        taxBikValue: state.taxBikValue,
        accounts: state.accounts,
        pensionAge: state.pensionAge,
        fireAge: state.fireAge,
        withdrawalRate: state.withdrawalRate,
        salaryReplacementRate: state.salaryReplacementRate,
        enablePensionLumpSum: state.enablePensionLumpSum,
        pensionLumpSumAge: state.pensionLumpSumAge,
        pensionLumpSumMaxAmount: state.pensionLumpSumMaxAmount,
        lumpSumToBrokerageRate: state.lumpSumToBrokerageRate,
        enableHouseWithdrawal: state.enableHouseWithdrawal,
        houseWithdrawalAge: state.houseWithdrawalAge,
        houseDepositFromBrokerageRate: state.houseDepositFromBrokerageRate,
        mortgageExemption: state.mortgageExemption,
        baseHousePrice: state.baseHousePrice,
        houseAnnualPriceIncrease: state.houseAnnualPriceIncrease,
        includeStatePension: state.includeStatePension,
        statePensionAge: state.statePensionAge,
        statePensionWeeklyAmount: state.statePensionWeeklyAmount,
      }) as any,
    },
  ),
);
