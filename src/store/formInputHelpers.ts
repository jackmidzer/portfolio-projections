import type { FormInputs } from '@/store/slices/formSlice';
import { defaultFormInputs } from '@/store/slices/formSlice';
import { parseNumeric } from '@/utils/parseNumeric';

/** All keys of FormInputs, derived from defaultFormInputs so new fields are automatically included. */
export const FORM_INPUT_KEYS = Object.keys(defaultFormInputs) as (keyof FormInputs)[];

/**
 * Validated/parsed snapshot of form inputs for use by the calculation layer.
 * All `number | ''` sentinel values are resolved to plain numbers.
 */
export interface ParsedFormInputs {
  age: number;
  future: number;
  salary: number;
  increase: number;
  bonus: number;
  pension: number;
  withdrawal: number;
  fireAge: number;
  replacement: number;
  brokerageRate: number;
  lumpSumAge: number;
  lumpSumMaxAmount: number;
  houseAge: number;
  houseBrokerageRate: number;
  bikValue: number;
  statePensionAge: number;
  statePensionWeeklyAmount: number;
  prsiContributionsToDate: number;
  taxBandIndexation: number;
  inflationRate: number;
}

/**
 * Parse all `number | ''` form fields in one pass.
 * Centralises the 42+ `typeof x === 'number' ? x : fallback` guards.
 */
export function parseFormInputs(
  state: FormInputs,
  currentAge: number | '',
): ParsedFormInputs {
  return {
    age: parseNumeric(currentAge),
    future: parseNumeric(state.targetAge),
    salary: parseNumeric(state.currentSalary),
    increase: parseNumeric(state.annualSalaryIncrease),
    bonus: parseNumeric(state.bonusPercent, 0),
    pension: parseNumeric(state.pensionAge),
    withdrawal: parseNumeric(state.withdrawalRate),
    fireAge: parseNumeric(state.fireAge),
    replacement: parseNumeric(state.salaryReplacementRate),
    brokerageRate: parseNumeric(state.lumpSumToBrokerageRate),
    lumpSumAge: parseNumeric(state.pensionLumpSumAge),
    lumpSumMaxAmount: parseNumeric(state.pensionLumpSumMaxAmount),
    houseAge: parseNumeric(state.houseWithdrawalAge),
    houseBrokerageRate: parseNumeric(state.houseDepositFromBrokerageRate),
    bikValue: parseNumeric(state.taxBikValue, 0),
    statePensionAge: parseNumeric(state.statePensionAge, 66),
    statePensionWeeklyAmount: parseNumeric(state.statePensionWeeklyAmount, 299.30),
    prsiContributionsToDate: parseNumeric(state.prsiContributionsToDate, 0),
    taxBandIndexation: parseNumeric(state.taxBandIndexation, 0),
    inflationRate: parseNumeric(state.inflationRate, 2.5),
  };
}

/** Extract a shallow snapshot of all FormInputs keys from a store state object. */
export function extractFormInputs(state: Record<string, unknown>): FormInputs {
  return structuredClone(
    Object.fromEntries(FORM_INPUT_KEYS.map(k => [k, state[k]]))
  ) as unknown as FormInputs;
}
