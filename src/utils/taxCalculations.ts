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
  EXIT_TAX_RATE,
  PENSION_AGE_TAX_CREDIT,
  PENSION_LUMP_SUM_TAX_FREE_THRESHOLD,
  PENSION_LUMP_SUM_STANDARD_RATE_THRESHOLD,
  PENSION_LUMP_SUM_STANDARD_RATE,
  PENSION_LUMP_SUM_MARGINAL_RATE,
  getTaxBands,
  getIndexedTaxBands,
  getIndexedUSCRates,
  getPersonalTaxCredit,
  getEarnedIncomeCredit,
  getMedicalInsuranceCredit,
  getRentReliefCredit,
  PRSI_WEEKS_PER_YEAR,
  PRSI_MIN_CONTRIBUTIONS,
  PRSI_FULL_CONTRIBUTIONS,
} from '../constants/irishTaxRates2026';
import { TaxCalculationResult, CareerBreak } from '../types/index';

export { PRSI_MIN_CONTRIBUTIONS, PRSI_FULL_CONTRIBUTIONS, PRSI_WEEKS_PER_YEAR };

export interface TaxCalculationInput {
  grossSalary: number;
  pensionContribution: number;
  bikValue: number;
  claimRentRelief?: boolean;       // true = apply €1,000 Rent Relief credit (renters only)
  claimMedicalInsurance?: boolean; // true = apply €200 Medical Insurance credit (VHI/private health)
  /** Pre-computed threshold multiplier: (1 + indexation%)^yearsFromBase. Default 1 = no indexation. */
  taxBandMultiplier?: number;
}

/**
 * Calculate PAYE tax with band details
 * @param taxBandMultiplier - cumulative threshold multiplier for band indexation (default 1)
 */
function calculatePayeTaxWithDetails(
  taxableIncome: number,
  claimRentRelief = true,
  claimMedicalInsurance = true,
  taxBandMultiplier = 1,
): { totalTax: number; bands: Array<{ startThreshold: number; threshold: number; rate: number; incomeInBand: number; taxInBand: number }>; creditsApplied: { personal: number; earned: number; medicalInsurance: number; rentRelief: number; total: number } } {
  const taxBands = taxBandMultiplier !== 1 ? getIndexedTaxBands(taxBandMultiplier) : getTaxBands();
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
  const medicalInsuranceCredit = claimMedicalInsurance ? getMedicalInsuranceCredit() : 0;
  const rentReliefCredit = claimRentRelief ? getRentReliefCredit() : 0;
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
 * @param taxBandMultiplier - cumulative threshold multiplier for band indexation (default 1)
 */
function calculateUSCWithDetails(
  grossSalary: number,
  taxBandMultiplier = 1,
): { totalUSC: number; bands: Array<{ startThreshold: number; threshold: number; rate: number; incomeInBand: number; uscInBand: number }> } {
  const uscRates = taxBandMultiplier !== 1 ? getIndexedUSCRates(taxBandMultiplier) : USC_RATES;
  let usc = 0;
  let previousThreshold = 0;
  const bands: Array<{ startThreshold: number; threshold: number; rate: number; incomeInBand: number; uscInBand: number }> = [];

  for (const band of uscRates) {
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
 * Calculate PAYE tax based on taxable income
 * @param taxBandMultiplier - cumulative threshold multiplier for band indexation (default 1)
 */
export function calculatePayeTax(taxableIncome: number, claimRentRelief = true, claimMedicalInsurance = true, taxBandMultiplier = 1): number {
  const taxBands = taxBandMultiplier !== 1 ? getIndexedTaxBands(taxBandMultiplier) : getTaxBands();
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
  const medicalInsuranceCreditVal = claimMedicalInsurance ? getMedicalInsuranceCredit() : 0;
  const rentReliefCreditVal = claimRentRelief ? getRentReliefCredit() : 0;
  const totalCredits = personalCredit + earnedCredit + medicalInsuranceCreditVal + rentReliefCreditVal;

  // Tax cannot be negative after credits
  return Math.max(0, tax - totalCredits);
}

/**
 * Calculate Universal Social Charge (USC)
 * USC is applied to gross income (not reduced by pension contributions)
 * @param taxBandMultiplier - cumulative threshold multiplier for band indexation (default 1)
 */
export function calculateUSC(grossSalary: number, taxBandMultiplier = 1): number {
  const uscRates = taxBandMultiplier !== 1 ? getIndexedUSCRates(taxBandMultiplier) : USC_RATES;
  let usc = 0;
  let previousThreshold = 0;

  for (const band of uscRates) {
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
  const { grossSalary, pensionContribution, bikValue, claimRentRelief = true, claimMedicalInsurance = true, taxBandMultiplier = 1 } = input;

  // BIK is added to gross income for all tax purposes
  const grossIncomeWithBIK = grossSalary + bikValue;

  // Taxable income: Gross with BIK minus pension contribution
  // (Pension contributions reduce PAYE taxable income)
  const taxableIncome = calculateTaxableIncome(grossIncomeWithBIK, pensionContribution);

  // Calculate PAYE with band details and apply reliefs
  const payeeTaxDetails = calculatePayeTaxWithDetails(taxableIncome, claimRentRelief, claimMedicalInsurance, taxBandMultiplier);
  const payeTax = payeeTaxDetails.totalTax;
  const payeTaxBands = payeeTaxDetails.bands;
  const taxCredits = payeeTaxDetails.creditsApplied;

  // Calculate USC with band details
  const uscDetails = calculateUSCWithDetails(grossIncomeWithBIK, taxBandMultiplier);
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
    pensionContribution: pensionContribution,
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
  bikValue: number = 0,
  claimRentRelief = true,
  claimMedicalInsurance = true,
  taxBandMultiplier = 1,
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
  const salaryPayeTax = calculatePayeTax(salaryTaxableIncome, claimRentRelief, claimMedicalInsurance, taxBandMultiplier);
  const salaryUSC = calculateUSC(salaryGrossIncomeWithBIK, taxBandMultiplier);
  const salaryPRSI = calculatePRSI(salaryGrossIncomeWithBIK);
  const salaryTotalTax = salaryPayeTax + salaryUSC + salaryPRSI;

  // Calculate tax on salary + bonus
  const combinedPayeTax = calculatePayeTax(combinedTaxableIncome, claimRentRelief, claimMedicalInsurance, taxBandMultiplier);
  const combinedUSC = calculateUSC(combinedGrossIncomeWithBIK, taxBandMultiplier);
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
  bikValue: number = 0,
  claimRentRelief = true,
  claimMedicalInsurance = true,
  taxBandMultiplier = 1,
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
  const bonusTaxBurden = calculateBonusTaxBurden(grossSalary, bonusPercent, pensionContributionPercent, bikValue, claimRentRelief, claimMedicalInsurance, taxBandMultiplier);
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
export function calculatePensionWithdrawalTax(withdrawal: number, isInPensionPhase: boolean, age: number, taxBandMultiplier = 1): {
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
  const payeeTaxDetails = calculatePayeTaxWithDetails(withdrawal, true, true, taxBandMultiplier);
  const payeTax = payeeTaxDetails.totalTax;

  // Apply USC (no reduction for pension contributions on withdrawal income)
  const uscDetails = calculateUSCWithDetails(withdrawal, taxBandMultiplier);
  const usc = uscDetails.totalUSC;

  // PRSI applies to pension withdrawals when age < 66 (state pension age)
  const prsi = age < 66 ? withdrawal * PRSI_SETTINGS.employeeRate : 0;

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
 * CGT is only applied to the capital gain portion (withdrawal * gainRatio), not the full withdrawal.
 * Applies the annual €1,270 CGT exemption before taxing.
 * @param withdrawal - gross withdrawal amount
 * @param gainRatio - proportion of the withdrawal that is capital gain (0–1); defaults to 1 for backward compatibility
 * @param remainingExemption - remaining annual CGT exemption available (defaults to 0 for backward compat)
 * @returns result including exemption used so callers can track the running total
 */
export function calculateBrokerageCapitalGainsTax(
  withdrawal: number,
  gainRatio: number = 1,
  remainingExemption: number = 0,
): {
  grossWithdrawal: number;
  cgt: number;
  netWithdrawal: number;
  exemptionUsed: number;
} {
  const totalGain = withdrawal * Math.max(0, Math.min(1, gainRatio));
  const exemptionUsed = Math.min(remainingExemption, totalGain);
  const taxableGain = Math.max(0, totalGain - exemptionUsed);
  const cgt = taxableGain * CGT_RATE;
  const netWithdrawal = withdrawal - cgt;

  return {
    grossWithdrawal: withdrawal,
    cgt,
    netWithdrawal,
    exemptionUsed,
  };
}

/**
 * Calculate Exit Tax on ETF gains (deemed disposal or actual sale).
 * Irish Revenue applies exit tax at 38% on the gain portion of ETF holdings.
 * @param amount - the gross amount (withdrawal or deemed balance)
 * @param gainRatio - proportion that is gain (0–1)
 */
export function calculateExitTax(amount: number, gainRatio: number = 1): {
  grossAmount: number;
  exitTax: number;
  netAmount: number;
} {
  const taxableGain = amount * Math.max(0, Math.min(1, gainRatio));
  const exitTax = taxableGain * EXIT_TAX_RATE;
  const netAmount = amount - exitTax;

  return {
    grossAmount: amount,
    exitTax,
    netAmount,
  };
}

/**
 * Calculate blended brokerage withdrawal tax across ETF (exit tax) and stock (CGT) portions.
 * Splits the withdrawal proportionally between ETF and stock sub-balances,
 * then applies the appropriate tax regime to each portion.
 * @param withdrawal - total gross withdrawal amount
 * @param etfBalance - current ETF sub-balance
 * @param stockBalance - current stock sub-balance
 * @param etfGainRatio - proportion of ETF sub-balance that is gain (0–1)
 * @param stockGainRatio - proportion of stock sub-balance that is gain (0–1)
 * @param remainingCgtExemption - remaining annual CGT exemption (applied to stock portion only)
 */
export function calculateBrokerageWithdrawalTax(withdrawal: number, etfBalance: number, stockBalance: number, etfGainRatio: number, stockGainRatio: number, remainingCgtExemption: number = 0): {
  etfWithdrawal: number;
  stockWithdrawal: number;
  etfExitTax: number;
  stockCgt: number;
  totalTax: number;
  netWithdrawal: number;
  cgtExemptionUsed: number;
} {
  const totalBalance = etfBalance + stockBalance;
  if (totalBalance <= 0 || withdrawal <= 0) {
    return { etfWithdrawal: 0, stockWithdrawal: 0, etfExitTax: 0, stockCgt: 0, totalTax: 0, netWithdrawal: withdrawal, cgtExemptionUsed: 0 };
  }

  const etfPortion = withdrawal * (etfBalance / totalBalance);
  const stockPortion = withdrawal * (stockBalance / totalBalance);

  const etfResult = calculateExitTax(etfPortion, etfGainRatio);
  const stockResult = calculateBrokerageCapitalGainsTax(stockPortion, stockGainRatio, remainingCgtExemption);

  const totalTax = etfResult.exitTax + stockResult.cgt;

  return {
    etfWithdrawal: etfPortion,
    stockWithdrawal: stockPortion,
    etfExitTax: etfResult.exitTax,
    stockCgt: stockResult.cgt,
    totalTax,
    netWithdrawal: withdrawal - totalTax,
    cgtExemptionUsed: stockResult.exemptionUsed,
  };
}

/**
 * Calculate Irish pension retirement lump sum tax.
 * Rules (Revenue.ie):
 *   - First €200,000: tax-free
 *   - €200,001 – €500,000: taxed at 20% (standard rate)
 *   - Above €500,000: taxed at 40% (marginal/higher rate)
 *
 * @param lumpSumAmount - The gross lump sum amount (e.g. 25% of pension balance)
 */
export function calculatePensionLumpSumTax(lumpSumAmount: number): {
  taxFreeAmount: number;
  standardRateAmount: number;
  standardRateTax: number;
  marginalAmount: number;
  marginalTax: number;
  totalTax: number;
  netLumpSum: number;
} {
  const taxFreeAmount = Math.min(lumpSumAmount, PENSION_LUMP_SUM_TAX_FREE_THRESHOLD);

  const standardRateAmount = Math.min(
    Math.max(0, lumpSumAmount - PENSION_LUMP_SUM_TAX_FREE_THRESHOLD),
    PENSION_LUMP_SUM_STANDARD_RATE_THRESHOLD - PENSION_LUMP_SUM_TAX_FREE_THRESHOLD
  );
  const standardRateTax = standardRateAmount * PENSION_LUMP_SUM_STANDARD_RATE;

  const marginalAmount = Math.max(0, lumpSumAmount - PENSION_LUMP_SUM_STANDARD_RATE_THRESHOLD);
  const marginalTax = marginalAmount * PENSION_LUMP_SUM_MARGINAL_RATE;

  const totalTax = standardRateTax + marginalTax;
  const netLumpSum = lumpSumAmount - totalTax;

  return {
    taxFreeAmount,
    standardRateAmount,
    standardRateTax,
    marginalAmount,
    marginalTax,
    totalTax,
    netLumpSum,
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

// ─── PRSI Contribution Summary ───────────────────────────────────────────────

export interface PrsiSummary {
  /** User-declared PRSI contributions already paid before the projection start */
  priorContributions: number;
  /** Class A: projected contributions during employment (currentAge → fireAge, minus full breaks) */
  projectedEmploymentContributions: number;
  /**
   * Class S: projected contributions during private pension drawdown phase
   * (pensionAge → min(statePensionAge, 66)). PRSI stops at 66 regardless.
   * Zero if pensionAge ≥ statePensionAge, or if no pensionAge was provided.
   */
  projectedPensionContributions: number;
  /** Total projected new contributions (employment + pension drawdown) */
  projectedNewContributions: number;
  /** Total estimated contributions (prior + projected) */
  totalContributions: number;
  /** Weeks still needed to reach the minimum threshold (520); 0 if already met */
  shortfallToMinimum: number;
  /** Weeks still needed to reach the full-rate threshold (2080); 0 if already met */
  shortfallToFull: number;
  /** Additional full working years needed beyond FIRE age to reach 2,080 contributions; 0 if met */
  additionalYearsToFull: number;
  /**
   * 'full'    – projected contributions ≥ 2,080 (full rate)
   * 'partial' – projected contributions ≥ 520 but < 2,080
   * 'none'    – projected contributions < 520 (no entitlement)
   */
  status: 'full' | 'partial' | 'none';
  /** Percentage of full-rate contributions achieved (capped at 100) */
  percentOfFull: number;
  /** Estimated weekly State Pension (proportional to contributions; 0 if below minimum) */
  estimatedWeeklyStatePension: number;
  /** Estimated annual State Pension */
  estimatedAnnualStatePension: number;
}

/**
 * Estimate the total PRSI (Pay Related Social Insurance) contributions a user
 * will have made by their State Pension age, split by contribution source.
 *
 * Phase A – Employment (Class A): currentAge → fireAge
 *   - 52 contributions/year of salaried work.
 *   - Full career breaks (salaryPercent = 0) pause contributions.
 *   - Part-time breaks (salaryPercent > 0) still count as employment.
 *
 * Phase B – Bridging (fireAge → pensionAge): NO PRSI
 *   - Living off brokerage/savings; no employment income or pension income,
 *     so no PRSI liability.
 *
 * Phase C – Pension drawdown (Class S): pensionAge → min(statePensionAge, 66)
 *   - Occupational pension income below age 66 is subject to Class S PRSI.
 *   - 52 contributions/year until PRSI exemption kicks in at 66.
 *
 * Thresholds (Irish Social Protection):
 * - 520 contributions  (10 years) → minimum entitlement to ANY State Pension
 * - 2,080 contributions (40 years) → full-rate State Pension
 *
 * State Pension estimate uses simple proportional scaling between the
 * minimum (520) and full (2,080) thresholds against the provided weekly rate.
 */
export function calculatePrsiSummary(params: {
  currentAge: number;
  fireAge: number;
  priorContributions: number;
  careerBreaks: CareerBreak[];
  /** Age when private pension drawdown begins (Class S PRSI starts here) */
  pensionAge?: number;
  /** Age when State Pension starts (PRSI exempt from this age, max 66) */
  statePensionAge?: number;
  /** Full-rate weekly State Pension used to scale partial estimates */
  statePensionWeeklyAmount?: number;
}): PrsiSummary {
  const {
    currentAge,
    fireAge,
    priorContributions,
    careerBreaks,
    pensionAge,
    statePensionAge = 66,
    statePensionWeeklyAmount = 299.30,
  } = params;

  // ── Phase A: employment (Class A) ──────────────────────────────────────────
  let breakWeeks = 0;
  for (const cb of careerBreaks) {
    if (cb.salaryPercent > 0) continue; // still employed part-time → PRSI accrues
    const overlapFrom = Math.max(cb.fromAge, currentAge);
    const overlapTo   = Math.min(cb.toAge, fireAge);
    if (overlapTo > overlapFrom) {
      breakWeeks += Math.round((overlapTo - overlapFrom) * PRSI_WEEKS_PER_YEAR);
    }
  }
  const workingYears = Math.max(0, fireAge - currentAge);
  const projectedEmploymentContributions = Math.max(
    0,
    Math.round(workingYears * PRSI_WEEKS_PER_YEAR) - breakWeeks,
  );

  // ── Phase C: pension drawdown (Class S) ────────────────────────────────────
  // PRSI is exempt from statePensionAge (capped at 66 regardless).
  const prsiExemptAge = Math.min(statePensionAge, 66);
  const pensionPrsiYears =
    pensionAge !== undefined
      ? Math.max(0, prsiExemptAge - Math.max(pensionAge, fireAge))
      : 0;
  const projectedPensionContributions = Math.round(pensionPrsiYears * PRSI_WEEKS_PER_YEAR);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const projectedNewContributions = projectedEmploymentContributions + projectedPensionContributions;
  const totalContributions = priorContributions + projectedNewContributions;

  const shortfallToMinimum = Math.max(0, PRSI_MIN_CONTRIBUTIONS - totalContributions);
  const shortfallToFull    = Math.max(0, PRSI_FULL_CONTRIBUTIONS - totalContributions);
  const additionalYearsToFull = shortfallToFull > 0
    ? Math.ceil(shortfallToFull / PRSI_WEEKS_PER_YEAR)
    : 0;

  const percentOfFull = Math.min(100, Math.round((totalContributions / PRSI_FULL_CONTRIBUTIONS) * 100));

  let status: PrsiSummary['status'];
  if (totalContributions >= PRSI_FULL_CONTRIBUTIONS) {
    status = 'full';
  } else if (totalContributions >= PRSI_MIN_CONTRIBUTIONS) {
    status = 'partial';
  } else {
    status = 'none';
  }

  // ── State Pension estimate (proportional within min→full band) ─────────────
  const estimatedWeeklyStatePension =
    status === 'none'
      ? 0
      : Math.min(
          statePensionWeeklyAmount,
          (Math.min(totalContributions, PRSI_FULL_CONTRIBUTIONS) / PRSI_FULL_CONTRIBUTIONS) *
            statePensionWeeklyAmount,
        );
  const estimatedAnnualStatePension = estimatedWeeklyStatePension * 52;

  return {
    priorContributions,
    projectedEmploymentContributions,
    projectedPensionContributions,
    projectedNewContributions,
    totalContributions,
    shortfallToMinimum,
    shortfallToFull,
    additionalYearsToFull,
    status,
    percentOfFull,
    estimatedWeeklyStatePension,
    estimatedAnnualStatePension,
  };
}
