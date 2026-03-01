import { HouseDepositCalculation } from '../types';

/**
 * Calculate monthly mortgage repayment using the standard annuity formula:
 * P * [r(1+r)^n] / [(1+r)^n - 1]
 * @param principal - loan amount (mortgage principal)
 * @param annualRate - annual interest rate as percentage (e.g., 4.0 for 4%)
 * @param termYears - mortgage term in years
 * @returns monthly repayment amount
 */
export function calculateMonthlyMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12); // interest-free loan

  const r = annualRate / 100 / 12; // monthly interest rate
  const n = termYears * 12; // total number of payments
  const factor = Math.pow(1 + r, n);
  return principal * (r * factor) / (factor - 1);
}

/**
 * Calculate house deposit requirements based on projected house price and available mortgage
 * @param purchaseAge Age at which house will be purchased
 * @param currentAge Current age
 * @param projectedSalary Projected annual salary at purchase age
 * @param projectedBonus Projected bonus amount at purchase age
 * @param baseHousePrice Current average house price (EUR)
 * @param houseAnnualPriceIncrease Annual house price increase as percentage
 * @param mortgageExemption Whether to apply mortgage exemption (multiplier × 4.5 instead of × 4)
 * @param mortgageInterestRate Annual mortgage interest rate (percentage, e.g. 4.0)
 * @param mortgageTerm Mortgage term in years (e.g. 30)
 * @returns HouseDepositCalculation with projected price, mortgage, deposit, LTV, and mortgage repayment info
 */
export const calculateHouseMetrics = (
  purchaseAge: number,
  currentAge: number,
  projectedSalary: number,
  projectedBonus: number,
  baseHousePrice: number,
  houseAnnualPriceIncrease: number,
  mortgageExemption: boolean = true,
  mortgageInterestRate?: number,
  mortgageTerm?: number,
): HouseDepositCalculation => {
  // Calculate years until purchase (guard against purchaseAge in the past)
  const yearsUntilPurchase = Math.max(0, purchaseAge - currentAge);
  
  // Calculate house price at purchase age using compound growth
  const projectedHousePrice = baseHousePrice * Math.pow(1 + houseAnnualPriceIncrease / 100, yearsUntilPurchase);
  
  // Calculate maximum mortgage based on exemption status
  // If exemption: (salary + bonus/2) × 4.5
  // If no exemption: (salary + bonus/2) × 4
  const mortgageMultiplier = mortgageExemption ? 4.5 : 4;
  const uncappedMortgage = (projectedSalary + projectedBonus / 2) * mortgageMultiplier;

  // Irish lending rules require a minimum 10% deposit (max 90% LTV), so cap the mortgage accordingly
  const maxMortgage = projectedHousePrice * 0.9;
  const projectedMortgage = Math.min(uncappedMortgage, maxMortgage);

  // Deposit is always at least 10% of the house price
  const depositRequired = projectedHousePrice - projectedMortgage;

  // Calculate LTV: (mortgage / house price) × 100, capped at 90%
  const loanToValuePercent = Math.min((projectedMortgage / projectedHousePrice) * 100, 90);

  // Calculate mortgage repayment details if interest rate and term are provided
  const rate = mortgageInterestRate ?? 4.0;
  const term = mortgageTerm ?? 30;
  const monthlyMortgagePayment = calculateMonthlyMortgagePayment(projectedMortgage, rate, term);
  const totalMortgageInterest = (monthlyMortgagePayment * term * 12) - projectedMortgage;
  
  return {
    projectedHousePrice,
    projectedSalary,
    projectedMortgage,
    depositRequired,
    loanToValuePercent,
    monthlyMortgagePayment,
    totalMortgageInterest: Math.max(0, totalMortgageInterest),
  };
};
