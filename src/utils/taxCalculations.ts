/**
 * Irish Tax Calculator Utility
 * Calculates PAYE, USC, PRSI, and net salary based on Irish tax laws
 */

import {
  USC_RATES,
  PRSI_SETTINGS,
  PENSION_TAX_RELIEF_CAP,
  getTaxBands,
  getPersonalTaxCredit,
  getEarnedIncomeCredit,
} from '../constants/irishTaxRates2026';
import { TaxCalculationResult } from '../types/index';

export interface TaxCalculationInput {
  grossSalary: number;
  pensionContribution: number;
  bikValue: number;
  rentalRelief: number;
  medicalInsuranceRelief: number;
}

/**
 * Calculate PAYE tax with band details
 */
function calculatePayeTaxWithDetails(
  taxableIncome: number,
  rentalRelief: number = 0,
  medicalInsuranceRelief: number = 0
): { totalTax: number; bands: Array<{ startThreshold: number; threshold: number; rate: number; incomeInBand: number; taxInBand: number }>; creditsApplied: { personal: number; earned: number; rental: number; medicalInsurance: number; total: number } } {
  const taxBands = getTaxBands();
  let tax = 0;
  let previousThreshold = 0;
  const bands: Array<{ startThreshold: number; threshold: number; rate: number; incomeInBand: number; taxInBand: number }> = [];

  for (const band of taxBands) {
    const bandLimit = band.threshold;
    const bandIncome = Math.min(taxableIncome, bandLimit) - previousThreshold;

    if (bandIncome > 0) {
      const taxInBand = bandIncome * band.rate;
      tax += taxInBand;
      bands.push({
        startThreshold: previousThreshold,
        threshold: bandLimit,
        rate: band.rate * 100,
        incomeInBand: bandIncome,
        taxInBand: taxInBand,
      });
    } else {
      break;
    }

    previousThreshold = bandLimit;
  }

  // Apply tax credits
  const personalCredit = getPersonalTaxCredit();
  const earnedCredit = getEarnedIncomeCredit();
  const totalCredits = personalCredit + earnedCredit + rentalRelief + medicalInsuranceRelief;

  // Tax cannot be negative after credits
  const finalTax = Math.max(0, tax - totalCredits);

  return {
    totalTax: finalTax,
    bands,
    creditsApplied: {
      personal: personalCredit,
      earned: earnedCredit,
      rental: rentalRelief,
      medicalInsurance: medicalInsuranceRelief,
      total: totalCredits,
    },
  };
}

/**
 * Calculate USC with band details
 */
function calculateUSCWithDetails(
  grossSalary: number
): { totalUSC: number; bands: Array<{ startThreshold: number; threshold: number; rate: number; incomeInBand: number; uscInBand: number }> } {
  let usc = 0;
  let previousThreshold = 0;
  const bands: Array<{ startThreshold: number; threshold: number; rate: number; incomeInBand: number; uscInBand: number }> = [];

  for (const band of USC_RATES) {
    const bandLimit = band.threshold;
    const bandIncome = Math.min(grossSalary, bandLimit) - previousThreshold;

    if (bandIncome > 0) {
      const uscInBand = bandIncome * band.rate;
      usc += uscInBand;
      bands.push({
        startThreshold: previousThreshold,
        threshold: bandLimit,
        rate: band.rate * 100,
        incomeInBand: bandIncome,
        uscInBand: uscInBand,
      });
    } else {
      break;
    }

    previousThreshold = bandLimit;
  }

  return {
    totalUSC: usc,
    bands,
  };
}

/**
 * Calculate PAYE tax based on taxable income (single filer)
 */
export function calculatePayeTax(taxableIncome: number): number {
  const taxBands = getTaxBands();
  let tax = 0;
  let previousThreshold = 0;

  for (const band of taxBands) {
    const bandLimit = band.threshold;
    const bandIncome = Math.min(taxableIncome, bandLimit) - previousThreshold;

    if (bandIncome > 0) {
      tax += bandIncome * band.rate;
    } else {
      break;
    }

    previousThreshold = bandLimit;
  }

  // Apply tax credits
  const personalCredit = getPersonalTaxCredit();
  const earnedCredit = getEarnedIncomeCredit();
  const totalCredits = personalCredit + earnedCredit;

  // Tax cannot be negative after credits
  return Math.max(0, tax - totalCredits);
}

/**
 * Calculate Universal Social Charge (USC)
 * USC is applied to gross income (not reduced by pension contributions)
 */
export function calculateUSC(grossSalary: number): number {
  let usc = 0;
  let previousThreshold = 0;

  for (const band of USC_RATES) {
    const bandLimit = band.threshold;
    const bandIncome = Math.min(grossSalary, bandLimit) - previousThreshold;

    if (bandIncome > 0) {
      usc += bandIncome * band.rate;
    } else {
      break;
    }

    previousThreshold = bandLimit;
  }

  return usc;
}

/**
 * Calculate PRSI (Pay Related Social Insurance)
 * PRSI is 4.2375% of gross salary
 */
export function calculatePRSI(grossSalary: number): number {
  return grossSalary * PRSI_SETTINGS.employeeRate;
}

/**
 * Calculate taxable income after accounting for pension contributions
 * Pension contributions reduce taxable income for PAYE calculation
 * Note: Tax relief on pension contributions is capped at €115,000 of earnings
 * (Employer contributions are not taken into consideration for this threshold)
 */
export function calculateTaxableIncome(
  grossSalary: number,
  pensionContribution: number
): number {
  // If earnings exceed the relief cap, only provide relief on capped earnings
  if (grossSalary > PENSION_TAX_RELIEF_CAP) {
    // Calculate the proportion of contributions that relate to capped earnings
    const contributionRate = pensionContribution / grossSalary;
    const cappedContributionRelief = PENSION_TAX_RELIEF_CAP * contributionRate;
    return Math.max(0, grossSalary - cappedContributionRelief);
  }
  
  // Below the cap, apply full pension contribution relief
  return Math.max(0, grossSalary - pensionContribution);
}

/**
 * Main function: Calculate complete tax breakdown for Irish salary
 */
export function calculateNetSalary(input: TaxCalculationInput): TaxCalculationResult {
  const { grossSalary, pensionContribution, bikValue, rentalRelief = 0, medicalInsuranceRelief = 0 } = input;

  // BIK is added to gross income for all tax purposes
  const grossIncomeWithBIK = grossSalary + bikValue;

  // Taxable income: Gross with BIK minus pension contribution
  // (Pension contributions reduce PAYE taxable income)
  const taxableIncome = calculateTaxableIncome(grossIncomeWithBIK, pensionContribution);

  // Calculate PAYE with band details and apply reliefs
  const payeeTaxDetails = calculatePayeTaxWithDetails(taxableIncome, rentalRelief, medicalInsuranceRelief);
  const payeTax = payeeTaxDetails.totalTax;
  const payeTaxBands = payeeTaxDetails.bands;
  const taxCredits = payeeTaxDetails.creditsApplied;

  // Calculate USC with band details
  const uscDetails = calculateUSCWithDetails(grossIncomeWithBIK);
  const usc = uscDetails.totalUSC;
  const uscBands = uscDetails.bands;

  // Calculate PRSI
  const prsi = calculatePRSI(grossIncomeWithBIK);

  // Total deductions
  const totalTax = payeTax + usc + prsi;

  // Disposable income: Gross salary minus pension contribution and taxes
  // (BIK is included in taxable income but not in cash disposable income)
  const netSalary = grossSalary - pensionContribution - totalTax;

  // Effective tax rate
  const effectiveTaxRate = grossIncomeWithBIK > 0 ? (totalTax / grossIncomeWithBIK) * 100 : 0;

  // Monthly amounts
  const monthlyNetSalary = netSalary / 12;

  return {
    grossSalary,
    pendingContribution: pensionContribution,
    bikValue,
    taxableIncome,
    payeTax,
    usc,
    prsi,
    totalDeductions: totalTax,
    netSalary,
    effectiveTaxRate,
    monthlyNetSalary,
    breakdown: {
      payeTax,
      usc,
      prsi,
      pensionContribution,
    },
    prsiPercentUsed: PRSI_SETTINGS.employeeRate * 100,
    taxCreditsApplied: taxCredits,
    payeTaxBands,
    uscBands,
  };
}

/**
 * Calculate monthly net salary from annual net
 */
export function calculateMonthlyNetSalary(annualNetSalary: number): number {
  return annualNetSalary / 12;
}
