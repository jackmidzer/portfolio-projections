import { HouseDepositCalculation } from '../types';

/**
 * Calculate house deposit requirements based on projected house price and available mortgage
 * @param purchaseAge Age at which house will be purchased
 * @param currentAge Current age
 * @param projectedSalary Projected annual salary at purchase age
 * @param projectedBonus Projected bonus amount at purchase age
 * @param baseHousePrice Current average house price (EUR)
 * @param houseAnnualPriceIncrease Annual house price increase as percentage
 * @param mortgageExemption Whether to apply mortgage exemption (multiplier × 4.5 instead of × 4)
 * @returns HouseDepositCalculation with projected price, mortgage, deposit, and LTV
 */
export const calculateHouseMetrics = (
  purchaseAge: number,
  currentAge: number,
  projectedSalary: number,
  projectedBonus: number,
  baseHousePrice: number,
  houseAnnualPriceIncrease: number,
  mortgageExemption: boolean = true
): HouseDepositCalculation => {
  // Calculate years until purchase
  const yearsUntilPurchase = purchaseAge - currentAge;
  
  // Calculate house price at purchase age using compound growth
  const projectedHousePrice = baseHousePrice * Math.pow(1 + houseAnnualPriceIncrease / 100, yearsUntilPurchase);
  
  // Calculate maximum mortgage based on exemption status
  // If exemption: (salary + bonus/2) × 4.5
  // If no exemption: (salary + bonus/2) × 4
  const mortgageMultiplier = mortgageExemption ? 4.5 : 4;
  const projectedMortgage = (projectedSalary + projectedBonus / 2) * mortgageMultiplier;
  
  // Deposit is the difference between house price and mortgage
  const depositRequired = Math.max(0, projectedHousePrice - projectedMortgage);
  
  // Calculate LTV: (mortgage / house price) × 100
  const loanToValuePercent = (projectedMortgage / projectedHousePrice) * 100;
  
  return {
    projectedHousePrice,
    projectedSalary,
    projectedMortgage,
    depositRequired,
    loanToValuePercent,
  };
};
