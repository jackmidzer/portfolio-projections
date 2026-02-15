/**
 * Irish Tax Rates and Thresholds for 2026 Tax Year
 * Based on Budget 2026 and current Revenue.ie guidance
 */

// PAYE Tax Bands (Single Person)
export const PAYE_TAX_BANDS = [
  { threshold: 44000, rate: 0.2 },    // 20% up to €44,000
  { threshold: Infinity, rate: 0.4 }, // 40% above €44,000
];

// Personal Tax Credits (annual)
export const PERSONAL_TAX_CREDIT = 2000;  // Single person personal tax credit
export const EARNED_INCOME_CREDIT = 2000; // Earned income credit (available to employees)
export const MEDICAL_INSURANCE_CREDIT = 200; // Medical Insurance tax credit
export const RENT_RELIEF_CREDIT = 1000; // Rent Relief tax credit

// Universal Social Charge (USC) Rates
export const USC_RATES = [
  { threshold: 12012, rate: 0.005 },    // 0.5% up to €12,012
  { threshold: 28700, rate: 0.02 },   // 2% from €12,012 to €28,700
  { threshold: 70044, rate: 0.03 },   // 3% from €28,700 to €70,044
  { threshold: Infinity, rate: 0.08 }, // 8% above €70,044
];

// PRSI (Pay Related Social Insurance)
export const PRSI_SETTINGS = {
  employeeRate: 0.042375,      // 4.2375% employee contribution (updated for 2026)
};

// Pension Tax Relief Cap
// Maximum amount of earnings taken into account for calculating tax relief
export const PENSION_TAX_RELIEF_CAP = 115000;

// Capital Gains Tax (CGT) Rate
export const CGT_RATE = 0.33; // 33% on brokerage withdrawals

// Deposit Interest Retention Tax (DIRT) Rate
// Tax on interest earned on savings accounts
export const DIRT_RATE = 0.33; // 33% on savings interest

// Pension Age Tax Credit
// Additional tax credit available for pension withdrawals during pension phase
export const PENSION_AGE_TAX_CREDIT = 245; // €245 age credit

/**
 * Get applicable tax bands (single filer)
 */
export function getTaxBands() {
  return PAYE_TAX_BANDS;
}

/**
 * Get personal tax credit (single filer)
 */
export function getPersonalTaxCredit(): number {
  return PERSONAL_TAX_CREDIT;
}

/**
 * Get earned income credit (for employees)
 */
export function getEarnedIncomeCredit(): number {
  return EARNED_INCOME_CREDIT;
}

/**
 * Get medical insurance tax credit
 */
export function getMedicalInsuranceCredit(): number {
  return MEDICAL_INSURANCE_CREDIT;
}

/**
 * Get rent relief tax credit
 */
export function getRentReliefCredit(): number {
  return RENT_RELIEF_CREDIT;
}
