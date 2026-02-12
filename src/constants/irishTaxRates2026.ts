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

// Universal Social Charge (USC) Rates
export const USC_RATES = [
  { threshold: 12012, rate: 0.005 },    // 0% up to €12,012
  { threshold: 28700, rate: 0.02 },   // 2% from €12,012 to €22,238
  { threshold: 70044, rate: 0.03 },   // 4% from €22,238 to €72,500
  { threshold: Infinity, rate: 0.08 }, // 8% above €72,500
];

// PRSI (Pay Related Social Insurance)
export const PRSI_SETTINGS = {
  employeeRate: 0.042375,      // 4.2375% employee contribution (updated for 2026)
  employerRate: 0.1105,      // 11.05% employer contribution
  annualCap: 3034,           // Annual maximum employee contribution
  weeklyThreshold: 352,      // Weekly earnings threshold for coverage
};

// Pension Contribution Limits
export const PENSION_SETTINGS = {
  annualContributionLimit: 60000,  // Maximum annual contribution
  reliefType: 'marginal',          // Tax relief at marginal rate (20% or 40%)
};

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
