import type { StateCreator } from 'zustand';
import type { PortfolioResults, TaxCalculationResult, HouseDepositCalculation } from '@/types';
import { calculateNetSalary, calculateBonusTaxBurden } from '@/utils/taxCalculations';
import { getAgeBracketPercentage } from '@/utils/calculations';
import { workerRequest } from '@/utils/workerRequest';
import { calculateHouseMetrics } from '@/utils/houseCalculations';
import { validateInputs } from '@/utils/validation';
import { parseFormInputs } from '@/store/formInputHelpers';
import type { FormInputs } from './formSlice';
import type { UISlice } from './uiSlice';
import type { CalcWorkerResponse } from '@/workers/calculationWorker';
import type { MCWorkerResponse } from '@/workers/monteCarloWorker';

// ─── Web Worker singletons ───────────────────────────────────────────

let calcWorker: Worker | null = null;

function getCalcWorker(): Worker {
  if (!calcWorker) {
    calcWorker = new Worker(
      new URL('../../workers/calculationWorker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return calcWorker;
}

let mcWorker: Worker | null = null;

function getMCWorker(): Worker {
  if (!mcWorker) {
    mcWorker = new Worker(
      new URL('../../workers/monteCarloWorker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return mcWorker;
}

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

// ─── Types ───────────────────────────────────────────────────────────

/** Monte Carlo percentile paths indexed by projection year */
export interface MonteCarloPercentiles {
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
  ages: number[];
}

// ─── Slice Interface ─────────────────────────────────────────────────

export interface ResultsSlice {
  results: PortfolioResults | null;
  taxCalculationResult: TaxCalculationResult | null;
  bonusTaxBurden: number;
  lastCalculatedBonusPercent: number;
  monteCarloPercentiles: MonteCarloPercentiles | null;
  isMonteCarloRunning: boolean;

  calculate: () => Promise<{ errors: string[] }>;
  runMonteCarloSimulations: () => void;

  getCurrentAge: () => number | '';
  getMonthsUntilBirthday: () => number;
  getHouseDepositMetrics: () => HouseDepositCalculation | null;
  getCurrentPensionPercent: () => number;
}

// Combined store type needed for cross-slice access
type RootLike = FormInputs & UISlice & ResultsSlice;

// ─── Slice Creator ───────────────────────────────────────────────────

export const createResultsSlice: StateCreator<RootLike, [], [], ResultsSlice> = (set, get) => ({
  results: null,
  taxCalculationResult: null,
  bonusTaxBurden: 0,
  lastCalculatedBonusPercent: 0,
  monteCarloPercentiles: null,
  isMonteCarloRunning: false,

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
    const p = parseFormInputs(state, currentAge);
    const yearsUntilPurchase = state.houseWithdrawalAge - currentAge;
    const projectedSalary = p.salary * Math.pow(1 + (p.increase / 100), yearsUntilPurchase);
    const projectedBonus = projectedSalary * (p.bonus / 100);
    return calculateHouseMetrics(
      state.houseWithdrawalAge,
      currentAge,
      projectedSalary,
      projectedBonus,
      state.baseHousePrice,
      state.houseAnnualPriceIncrease,
      state.mortgageExemption,
      state.mortgageInterestRate,
      state.mortgageTerm,
    );
  },

  getCurrentPensionPercent: () => {
    const state = get();
    const currentAge = state.getCurrentAge();
    if (typeof currentAge !== 'number') return 0;
    const pension = state.accounts.find(a => a.name === 'Pension');
    if (!pension?.ageBracketContributions) return 0;
    return getAgeBracketPercentage(currentAge, pension.ageBracketContributions);
  },

  // ─── Calculation ───────────────────────────────────────────────
  calculate: async () => {
    const state = get();
    const currentAge = state.getCurrentAge();
    const monthsUntilBirthday = state.getMonthsUntilBirthday();
    const houseDepositMetrics = state.getHouseDepositMetrics();
    const currentPensionPercent = state.getCurrentPensionPercent();

    // Run centralised validation
    const validationResult = validateInputs(state);
    set({ validationErrors: validationResult });

    if (Object.keys(validationResult).length > 0) {
      return { errors: Object.values(validationResult) };
    }

    // Parse values (safe after validation passes)
    const p = parseFormInputs(state, currentAge);

    // Run calculation via Web Worker
    const timeHorizon = p.future - p.age + 1;
    const taxInputData = {
      grossSalary: p.salary,
      pensionContribution: (p.salary * currentPensionPercent) / 100,
      bikValue: p.bikValue,
      claimRentRelief: state.claimRentRelief,
      claimMedicalInsurance: state.claimMedicalInsurance,
      taxBandIndexation: p.taxBandIndexation,
    };

    set({ isCalculating: true });

    const workerOptions = {
      accounts: state.accounts,
      timeHorizon,
      currentAge: p.age,
      currentSalary: p.salary,
      annualSalaryIncrease: p.increase,
      monthsUntilNextBirthday: monthsUntilBirthday,
      dateOfBirth: new Date(state.dateOfBirth),
      pensionAge: p.pension,
      withdrawalRate: p.withdrawal,
      fireAge: p.fireAge,
      salaryReplacementRate: p.replacement,
      lumpSumToBrokerageRate: p.brokerageRate,
      bonusPercent: p.bonus,
      houseWithdrawalAge: p.houseAge,
      enableHouseWithdrawal: state.enableHouseWithdrawal,
      houseDepositCalculation: houseDepositMetrics || undefined,
      houseDepositFromBrokerageRate: p.houseBrokerageRate,
      enablePensionLumpSum: state.enablePensionLumpSum,
      taxInputs: taxInputData,
      pensionLumpSumAge: p.lumpSumAge,
      mortgageExemption: state.mortgageExemption,
      pensionLumpSumMaxAmount: p.lumpSumMaxAmount,
      includeStatePension: state.includeStatePension,
      statePensionAge: p.statePensionAge,
      statePensionWeeklyAmount: p.statePensionWeeklyAmount,
      prsiContributionsToDate: p.prsiContributionsToDate,
      careerBreaks: state.careerBreaks,
      windfalls: state.windfalls,
    };

    try {
      const worker = getCalcWorker();
      const isCalcResult = (d: unknown): d is CalcWorkerResponse =>
        typeof d === 'object' && d !== null && (d as CalcWorkerResponse).type === 'result';
      const response = await workerRequest<CalcWorkerResponse>(
        worker,
        { type: 'calculate', options: workerOptions },
        isCalcResult,
      );
      const calculatedResults = response.results;

      // Calculate tax (fast, stays on main thread)
      let taxResult: TaxCalculationResult | null = null;
      let bonusTax = 0;
      taxResult = calculateNetSalary(taxInputData);
      if (p.bonus > 0) {
        bonusTax = calculateBonusTaxBurden(p.salary, p.bonus, currentPensionPercent, taxInputData.bikValue);
      }

      set({
        results: calculatedResults,
        taxCalculationResult: taxResult,
        bonusTaxBurden: bonusTax,
        lastCalculatedBonusPercent: p.bonus,
        isCalculating: false,
      });

      return { errors: [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        isCalculating: false,
        validationErrors: { _worker: message },
      });
      return { errors: [message] };
    }
  },

  // ─── Monte Carlo ──────────────────────────────────────────────
  runMonteCarloSimulations: () => {
    const state = get();

    const currentAge = state.getCurrentAge();
    const monthsUntilBirthday = state.getMonthsUntilBirthday();
    const houseDepositMetrics = state.getHouseDepositMetrics();
    const currentPensionPercent = state.getCurrentPensionPercent();

    const p = parseFormInputs(state, currentAge);
    const timeHorizon = p.future - p.age + 1;
    const taxInputData = {
      grossSalary: p.salary,
      pensionContribution: (p.salary * currentPensionPercent) / 100,
      bikValue: p.bikValue,
      claimRentRelief: state.claimRentRelief,
      claimMedicalInsurance: state.claimMedicalInsurance,
      taxBandIndexation: p.taxBandIndexation,
    };

    const baseOptions = {
      accounts: state.accounts,
      timeHorizon,
      currentAge: p.age,
      currentSalary: p.salary,
      annualSalaryIncrease: p.increase,
      monthsUntilNextBirthday: monthsUntilBirthday,
      dateOfBirth: new Date(state.dateOfBirth),
      pensionAge: p.pension,
      withdrawalRate: p.withdrawal,
      fireAge: p.fireAge,
      salaryReplacementRate: p.replacement,
      lumpSumToBrokerageRate: p.brokerageRate,
      bonusPercent: p.bonus,
      houseWithdrawalAge: p.houseAge,
      enableHouseWithdrawal: state.enableHouseWithdrawal,
      houseDepositCalculation: houseDepositMetrics || undefined,
      houseDepositFromBrokerageRate: p.houseBrokerageRate,
      enablePensionLumpSum: state.enablePensionLumpSum,
      taxInputs: taxInputData,
      pensionLumpSumAge: p.lumpSumAge,
      mortgageExemption: state.mortgageExemption,
      pensionLumpSumMaxAmount: p.lumpSumMaxAmount,
      includeStatePension: state.includeStatePension,
      statePensionAge: p.statePensionAge,
      statePensionWeeklyAmount: p.statePensionWeeklyAmount,
      prsiContributionsToDate: p.prsiContributionsToDate,
      careerBreaks: state.careerBreaks,
      windfalls: state.windfalls,
    };

    set({ isMonteCarloRunning: true });

    const worker = getMCWorker();
    const isMCResult = (d: unknown): d is MCWorkerResponse =>
      typeof d === 'object' && d !== null && (d as MCWorkerResponse).type === 'result';
    workerRequest<MCWorkerResponse>(
      worker,
      {
        type: 'run',
        baseOptions,
        simulations: state.monteCarloSimulations,
        returnVolatility: state.returnVolatility,
      },
      isMCResult,
    ).then((response) => {
      set({
        monteCarloPercentiles: response.percentiles,
        isMonteCarloRunning: false,
      });
    }).catch((err) => {
      console.warn('[Monte Carlo] Worker error:', err instanceof Error ? err.message : String(err));
      set({ isMonteCarloRunning: false });
    });
  },
});
