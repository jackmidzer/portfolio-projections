/**
 * Irish Tax Calculator Utility
 * Calculates PAYE, USC, PRSI, and net salary based on Irish tax laws
 */

import {
  USC_RATES,
  PRSI_SETTINGS,
  PENSION_TAX_RELIEF_CAP,
  CGT_RATE,
  DIRT_RATE,
  PENSION_AGE_TAX_CREDIT,
  getTaxBands,
  getPersonalTaxCredit,
  getEarnedIncomeCredit,
  getMedicalInsuranceCredit,
  getRentReliefCredit,
} from '../constants/irishTaxRates2026';
import { TaxCalculationResult } from '../types/index';

export interface TaxCalculationInput {
  grossSalary: number;
  pensionContribution: number;
  bikValue: number;
}

/**
 * Calculate PAYE tax with band details
 */
function calculatePayeTaxWithDetails(
  taxableIncome: number
): { totalTax: number; bands: Array<{ startThreshold: number; threshold: number; rate: number; incomeInBand: number; taxInBand: number }>; creditsApplied: { personal: number; earned: number; medicalInsurance: number; rentRelief: number; total: number } } {
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
  const medicalInsuranceCredit = getMedicalInsuranceCredit();
  const rentReliefCredit = getRentReliefCredit();
  const totalCredits = personalCredit + earnedCredit + medicalInsuranceCredit + rentReliefCredit;

  // Tax cannot be negative after credits
  const finalTax = Math.max(0, tax - totalCredits);

  return {
    totalTax: finalTax,
    bands,
    creditsApplied: {
      personal: personalCredit,
      earned: earnedCredit,
      medicalInsurance: medicalInsuranceCredit,
      rentRelief: rentReliefCredit,
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
  const medicalInsuranceCredit = getMedicalInsuranceCredit();
  const rentReliefCredit = getRentReliefCredit();
  const totalCredits = personalCredit + earnedCredit + medicalInsuranceCredit + rentReliefCredit;

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
  const { grossSalary, pensionContribution, bikValue } = input;

  // BIK is added to gross income for all tax purposes
  const grossIncomeWithBIK = grossSalary + bikValue;

  // Taxable income: Gross with BIK minus pension contribution
  // (Pension contributions reduce PAYE taxable income)
  const taxableIncome = calculateTaxableIncome(grossIncomeWithBIK, pensionContribution);

  // Calculate PAYE with band details and apply reliefs
  const payeeTaxDetails = calculatePayeTaxWithDetails(taxableIncome);
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

  // Net income: Gross salary minus pension contribution and taxes
  // (BIK is included in taxable income but not in cash net income)
  const netSalary = grossSalary - pensionContribution - totalTax;

  // Effective tax rate
  const effectiveTaxRate = grossSalary > 0 ? (totalTax / grossSalary) * 100 : 0;

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

/**
 * Calculate the additional tax burden from end-of-year bonus
 * Returns the tax amount that should be added in the month the bonus is received
 * 
 * The bonus tax burden is calculated as:
 * additionalTax = tax(salaryTaxableIncome + bonusTaxableIncome) - tax(salaryTaxableIncome)
 * 
 * Pension relief is applied to both salary and bonus combined before tax calculation
 */
export function calculateBonusTaxBurden(
  grossSalary: number,
  bonusPercent: number,
  pensionContributionPercent: number,
  bikValue: number = 0
): number {
  if (bonusPercent <= 0) {
    return 0;
  }

  // Calculate bonus amount and pension contribution on bonus
  const bonusAmount = grossSalary * (bonusPercent / 100);
  const pensionContributionAmount = (grossSalary * pensionContributionPercent) / 100;
  const bonusPensionContribution = (bonusAmount * pensionContributionPercent) / 100;

  // Calculate taxable income for salary only (salary + BIK - salary pension)
  const salaryGrossIncomeWithBIK = grossSalary + bikValue;
  const salaryTaxableIncome = calculateTaxableIncome(salaryGrossIncomeWithBIK, pensionContributionAmount);

  // Calculate taxable income for salary + bonus (salary + bonus + BIK - combined pension)
  const combinedGrossIncomeWithBIK = salaryGrossIncomeWithBIK + bonusAmount;
  const combinedPensionContribution = pensionContributionAmount + bonusPensionContribution;
  const combinedTaxableIncome = calculateTaxableIncome(combinedGrossIncomeWithBIK, combinedPensionContribution);

  // Calculate tax on salary only
  const salaryPayeTax = calculatePayeTax(salaryTaxableIncome);
  const salaryUSC = calculateUSC(salaryGrossIncomeWithBIK);
  const salaryPRSI = calculatePRSI(salaryGrossIncomeWithBIK);
  const salaryTotalTax = salaryPayeTax + salaryUSC + salaryPRSI;

  // Calculate tax on salary + bonus
  const combinedPayeTax = calculatePayeTax(combinedTaxableIncome);
  const combinedUSC = calculateUSC(combinedGrossIncomeWithBIK);
  const combinedPRSI = calculatePRSI(combinedGrossIncomeWithBIK);
  const combinedTotalTax = combinedPayeTax + combinedUSC + combinedPRSI;

  // Additional tax burden from bonus
  const bonusTaxBurden = Math.max(0, combinedTotalTax - salaryTotalTax);

  return bonusTaxBurden;
}

/**
 * Calculate net bonus after taxes and pension contributions
 * Returns the actual take-home amount from the bonus
 */
export function calculateNetBonus(
  grossSalary: number,
  bonusPercent: number,
  pensionContributionPercent: number,
  bikValue: number = 0
): { grossBonus: number; bonusNetSalary: number; bonusTaxBurden: number; bonusPensionContribution: number } {
  if (bonusPercent <= 0) {
    return {
      grossBonus: 0,
      bonusNetSalary: 0,
      bonusTaxBurden: 0,
      bonusPensionContribution: 0,
    };
  }

  const grossBonus = grossSalary * (bonusPercent / 100);
  const bonusPensionContribution = (grossBonus * pensionContributionPercent) / 100;
  const bonusTaxBurden = calculateBonusTaxBurden(grossSalary, bonusPercent, pensionContributionPercent, bikValue);
  const bonusNetSalary = grossBonus - bonusPensionContribution - bonusTaxBurden;

  return {
    grossBonus,
    bonusNetSalary,
    bonusTaxBurden,
    bonusPensionContribution,
  };
}

/**
 * Calculate tax on pension withdrawals
 * Pension withdrawals use income tax (PAYE + USC)
 * PRSI applies when age < 66 (state pension age)
 * Includes a €245 age tax credit when in pension phase (age 66+)
 */
export function calculatePensionWithdrawalTax(withdrawal: number, isInPensionPhase: boolean, age: number): {
  grossWithdrawal: number;
  payeTax: number;
  usc: number;
  prsi: number;
  totalTax: number;
  taxCredit: number;
  netWithdrawal: number;
} {
  // Pension withdrawals are treated as income for tax purposes
  // Apply PAYE tax on the withdrawal amount
  const payeTaxDetails = calculatePayeTaxWithDetails(withdrawal);
  const payeTax = payeTaxDetails.totalTax;

  // Apply USC (no reduction for pension contributions on withdrawal income)
  const uscDetails = calculateUSCWithDetails(withdrawal);
  const usc = uscDetails.totalUSC;

  // PRSI applies to pension withdrawals when age < 66 (state pension age)
  const prsi = age < 66 ? withdrawal * 0.042375 : 0;

  // Apply age tax credit (€245) if in pension phase and age >= 65
  let taxCredit = 0;
  if (isInPensionPhase && age >= 65) {
    taxCredit = PENSION_AGE_TAX_CREDIT;
  }

  // Total tax after applying credits
  const totalTaxBefore = payeTax + usc + prsi;
  const totalTax = Math.max(0, totalTaxBefore - taxCredit);

  // Net withdrawal is gross minus taxes
  const netWithdrawal = withdrawal - totalTax;

  return {
    grossWithdrawal: withdrawal,
    payeTax,
    usc,
    prsi,
    totalTax,
    taxCredit,
    netWithdrawal,
  };
}

/**
 * Calculate Capital Gains Tax (CGT) on brokerage withdrawals
 * CGT is taxed at a flat rate of 33%
 */
export function calculateBrokerageCapitalGainsTax(withdrawal: number): {
  grossWithdrawal: number;
  cgt: number;
  netWithdrawal: number;
} {
  const cgt = withdrawal * CGT_RATE;
  const netWithdrawal = withdrawal - cgt;

  return {
    grossWithdrawal: withdrawal,
    cgt,
    netWithdrawal,
  };
}

/**
 * Calculate Deposit Interest Retention Tax (DIRT) on savings interest
 * DIRT is a flat tax of 33% on interest earned on savings accounts
 * 
 * @param interest - The gross interest amount earned
 * @returns The DIRT tax amount
 */
export function calculateDirtTax(interest: number): number {
  return interest * DIRT_RATE;
}

/**
 * Calculate net interest after DIRT tax deduction
 * 
 * @param interest - The gross interest amount earned
 * @returns The interest amount after DIRT tax
 */
export function getNetInterestAfterDirt(interest: number): number {
  return interest - calculateDirtTax(interest);
}
