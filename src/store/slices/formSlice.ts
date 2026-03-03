import type { StateCreator } from 'zustand';
import type { AccountInput as AccountInputType, CareerBreak, Windfall } from '@/types';
import { validateInputs } from '@/utils/validation';

// ─── Form Inputs Interface ───────────────────────────────────────────

export interface FormInputs {
  // Personal
  dateOfBirth: string;
  targetAge: number | '';
  inflationRate: number | '';

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
  mortgageInterestRate: number;
  mortgageTerm: number;

  // State Pension
  includeStatePension: boolean;
  statePensionAge: number | '';
  statePensionWeeklyAmount: number | '';
  /** Number of PRSI weeks already paid before the projection starts (default 0) */
  prsiContributionsToDate: number | '';

  // Career Breaks
  careerBreaks: CareerBreak[];

  // Windfalls
  windfalls: Windfall[];

  // Tax Credits
  claimRentRelief: boolean;
  claimMedicalInsurance: boolean;
  /** Annual % rate at which PAYE/USC thresholds are indexed (default 1.5%) */
  taxBandIndexation: number | '';

  // Monte Carlo simulation
  monteCarloEnabled: boolean;
  monteCarloSimulations: number;
  returnVolatility: number;
}

// ─── Default Values ──────────────────────────────────────────────────

export const defaultFormInputs: FormInputs = {
  dateOfBirth: '1997-10-03',
  targetAge: 75,
  inflationRate: 2.5,
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
    { name: 'Brokerage', currentBalance: 20000, monthlyContribution: 35, expectedReturn: 8, isSalaryPercentage: true, bonusContributionPercent: 80, etfAllocationPercent: 50 },
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
  mortgageInterestRate: 4.0,
  mortgageTerm: 30,

  // State Pension
  includeStatePension: true,
  statePensionAge: 66,
  statePensionWeeklyAmount: 299.30,
  prsiContributionsToDate: 208,

  // Career Breaks
  careerBreaks: [],

  // Windfalls
  windfalls: [],

  // Tax Credits
  claimRentRelief: true,
  claimMedicalInsurance: true,
  taxBandIndexation: 1.5,

  // Monte Carlo
  monteCarloEnabled: false,
  monteCarloSimulations: 500,
  returnVolatility: 2,
};

// ─── Slice Interface ─────────────────────────────────────────────────

export interface FormSlice extends FormInputs {
  updateField: <K extends keyof FormInputs>(field: K, value: FormInputs[K]) => void;
  updateAccount: (index: number, account: AccountInputType) => void;
  resetForm: () => void;
}

// ─── Slice Creator ───────────────────────────────────────────────────

const STORAGE_KEY = 'portfolio-projections-storage';

export const createFormSlice: StateCreator<FormSlice, [], [], FormSlice> = (set) => ({
  ...defaultFormInputs,

  updateField: (field, value) => set(state => {
    const updated = { ...state, [field]: value };
    return { [field]: value, validationErrors: validateInputs(updated) } as any;
  }),

  updateAccount: (index, account) => set(state => {
    const newAccounts = [...state.accounts];
    newAccounts[index] = account;
    const updated = { ...state, accounts: newAccounts };
    return { accounts: newAccounts, validationErrors: validateInputs(updated) } as any;
  }),

  resetForm: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      ...defaultFormInputs,
      results: null,
      taxCalculationResult: null,
      bonusTaxBurden: 0,
      lastCalculatedBonusPercent: 0,
    } as any);
  },
});
