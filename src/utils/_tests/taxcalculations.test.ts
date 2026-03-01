import { describe, it, expect } from 'vitest';
import {
  calculatePayeTax,
  calculateUSC,
  calculatePRSI,
  calculateTaxableIncome,
  calculateNetSalary,
  calculateMonthlyNetSalary,
  calculateBonusTaxBurden,
  calculateNetBonus,
  calculatePensionWithdrawalTax,
  calculateBrokerageCapitalGainsTax,
  calculateExitTax,
  calculateBrokerageWithdrawalTax,
  calculatePensionLumpSumTax,
  calculateDirtTax,
  getNetInterestAfterDirt,
} from '../taxCalculations';
import {
  PRSI_SETTINGS,
  PENSION_TAX_RELIEF_CAP,
  CGT_RATE,
  DIRT_RATE,
  EXIT_TAX_RATE,
  PERSONAL_TAX_CREDIT,
  EARNED_INCOME_CREDIT,
  MEDICAL_INSURANCE_CREDIT,
  RENT_RELIEF_CREDIT,
} from '../../constants/irishTaxRates2026';

const TOTAL_CREDITS =
  PERSONAL_TAX_CREDIT + EARNED_INCOME_CREDIT + MEDICAL_INSURANCE_CREDIT + RENT_RELIEF_CREDIT;

// ---------------------------------------------------------------------------
// calculatePayeTax
// ---------------------------------------------------------------------------
describe('calculatePayeTax', () => {
  it('returns 0 for zero income', () => {
    expect(calculatePayeTax(0)).toBe(0);
  });

  it('returns 0 when tax credits exceed gross tax (low income)', () => {
    // €20,000 * 20% = €4,000 gross tax; credits = €5,200 → net 0
    expect(calculatePayeTax(20000)).toBe(0);
  });

  it('calculates tax within the 20% standard rate band', () => {
    // €40,000 → all in 20% band → 40000 * 0.2 = €8,000 – credits
    const expected = Math.max(0, 40000 * 0.2 - TOTAL_CREDITS);
    expect(calculatePayeTax(40000)).toBeCloseTo(expected, 2);
  });

  it('calculates tax at the 20%/40% boundary (€44,000)', () => {
    // Exactly at boundary: 44000 * 0.2 = €8,800 – credits
    const expected = Math.max(0, 44000 * 0.2 - TOTAL_CREDITS);
    expect(calculatePayeTax(44000)).toBeCloseTo(expected, 2);
  });

  it('calculates tax above the standard band into 40%', () => {
    // €80,000: 44000 * 0.2 + 36000 * 0.4 = 8800 + 14400 = 23200 – credits
    const expected = Math.max(0, 44000 * 0.2 + 36000 * 0.4 - TOTAL_CREDITS);
    expect(calculatePayeTax(80000)).toBeCloseTo(expected, 2);
  });

  it('handles very high income correctly', () => {
    const income = 200000;
    const expected = Math.max(0, 44000 * 0.2 + (income - 44000) * 0.4 - TOTAL_CREDITS);
    expect(calculatePayeTax(income)).toBeCloseTo(expected, 2);
  });

  it('never returns a negative value', () => {
    expect(calculatePayeTax(100)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// calculateUSC
// ---------------------------------------------------------------------------
describe('calculateUSC', () => {
  it('returns 0 for zero income', () => {
    expect(calculateUSC(0)).toBe(0);
  });

  it('calculates USC for income within first band only', () => {
    // €10,000 all at 0.5%
    expect(calculateUSC(10000)).toBeCloseTo(10000 * 0.005, 2);
  });

  it('calculates USC spanning first two bands', () => {
    // €20,000: 12012 * 0.5% + 7988 * 2%
    const expected = 12012 * 0.005 + (20000 - 12012) * 0.02;
    expect(calculateUSC(20000)).toBeCloseTo(expected, 2);
  });

  it('calculates USC spanning three bands', () => {
    // €50,000: 12012×0.5% + 16688×2% + 21312×3%
    const band1 = 12012 * 0.005;
    const band2 = (28700 - 12012) * 0.02;
    const band3 = (50000 - 28700) * 0.03;
    expect(calculateUSC(50000)).toBeCloseTo(band1 + band2 + band3, 2);
  });

  it('calculates USC spanning all four bands', () => {
    const income = 100000;
    const band1 = 12012 * 0.005;
    const band2 = (28700 - 12012) * 0.02;
    const band3 = (70044 - 28700) * 0.03;
    const band4 = (income - 70044) * 0.08;
    expect(calculateUSC(income)).toBeCloseTo(band1 + band2 + band3 + band4, 2);
  });
});

// ---------------------------------------------------------------------------
// calculatePRSI
// ---------------------------------------------------------------------------
describe('calculatePRSI', () => {
  it('returns 0 for zero income', () => {
    expect(calculatePRSI(0)).toBe(0);
  });

  it('calculates 4.2375% of gross salary', () => {
    expect(calculatePRSI(60000)).toBeCloseTo(60000 * PRSI_SETTINGS.employeeRate, 2);
  });

  it('calculates PRSI on high income', () => {
    expect(calculatePRSI(150000)).toBeCloseTo(150000 * PRSI_SETTINGS.employeeRate, 2);
  });
});

// ---------------------------------------------------------------------------
// calculateTaxableIncome
// ---------------------------------------------------------------------------
describe('calculateTaxableIncome', () => {
  it('subtracts pension contribution from gross salary', () => {
    expect(calculateTaxableIncome(80000, 5000)).toBe(75000);
  });

  it('returns 0 when pension contribution exceeds salary', () => {
    expect(calculateTaxableIncome(5000, 10000)).toBe(0);
  });

  it('caps pension relief at €115,000 earnings', () => {
    // Salary = €130,000, 10% pension contribution = €13,000
    // Capped: contributionRate = 13000/130000 = 10%
    // CappedRelief = 115000 * 10% = €11,500
    // Taxable = 130000 - 11500 = €118,500
    expect(calculateTaxableIncome(130000, 13000)).toBeCloseTo(118500, 2);
  });

  it('applies full relief when salary is exactly at the cap', () => {
    expect(calculateTaxableIncome(PENSION_TAX_RELIEF_CAP, 10000)).toBe(
      PENSION_TAX_RELIEF_CAP - 10000,
    );
  });

  it('applies full relief when salary is below the cap', () => {
    expect(calculateTaxableIncome(80000, 8000)).toBe(72000);
  });
});

// ---------------------------------------------------------------------------
// calculateNetSalary
// ---------------------------------------------------------------------------
describe('calculateNetSalary', () => {
  it('returns correct structure', () => {
    const result = calculateNetSalary({
      grossSalary: 60000,
      pensionContribution: 3000,
      bikValue: 0,
    });
    expect(result).toHaveProperty('grossSalary', 60000);
    expect(result).toHaveProperty('pensionContribution', 3000);
    expect(result).toHaveProperty('netSalary');
    expect(result).toHaveProperty('effectiveTaxRate');
    expect(result).toHaveProperty('monthlyNetSalary');
    expect(result).toHaveProperty('payeTaxBands');
    expect(result).toHaveProperty('uscBands');
  });

  it('net salary is less than gross', () => {
    const result = calculateNetSalary({
      grossSalary: 80000,
      pensionContribution: 5000,
      bikValue: 0,
    });
    expect(result.netSalary).toBeLessThan(80000);
    expect(result.netSalary).toBeGreaterThan(0);
  });

  it('monthly net salary equals annual net / 12', () => {
    const result = calculateNetSalary({
      grossSalary: 60000,
      pensionContribution: 3000,
      bikValue: 0,
    });
    expect(result.monthlyNetSalary).toBeCloseTo(result.netSalary / 12, 2);
  });

  it('BIK increases total tax but not cash net income (beyond tax effect)', () => {
    const noBik = calculateNetSalary({
      grossSalary: 60000,
      pensionContribution: 3000,
      bikValue: 0,
    });
    const withBik = calculateNetSalary({
      grossSalary: 60000,
      pensionContribution: 3000,
      bikValue: 5000,
    });
    // BIK adds to taxable income, increasing tax, lowering net salary
    expect(withBik.totalDeductions).toBeGreaterThan(noBik.totalDeductions);
    expect(withBik.netSalary).toBeLessThan(noBik.netSalary);
  });

  it('effective tax rate is between 0 and 100', () => {
    const result = calculateNetSalary({
      grossSalary: 80000,
      pensionContribution: 5000,
      bikValue: 0,
    });
    expect(result.effectiveTaxRate).toBeGreaterThan(0);
    expect(result.effectiveTaxRate).toBeLessThan(100);
  });

  it('returns 0 effective tax rate for zero salary', () => {
    const result = calculateNetSalary({
      grossSalary: 0,
      pensionContribution: 0,
      bikValue: 0,
    });
    expect(result.effectiveTaxRate).toBe(0);
  });

  it('golden value: €80k salary, €5k pension, no BIK', () => {
    const result = calculateNetSalary({
      grossSalary: 80000,
      pensionContribution: 5000,
      bikValue: 0,
    });
    // Taxable income = 80000 - 5000 = 75000
    // PAYE: 44000*0.2 + 31000*0.4 = 8800 + 12400 = 21200 - 5200 credits = 16000
    const expectedPaye = Math.max(0, 44000 * 0.2 + (75000 - 44000) * 0.4 - TOTAL_CREDITS);
    expect(result.payeTax).toBeCloseTo(expectedPaye, 0);

    // USC on 80000 gross
    const uscBand1 = 12012 * 0.005;
    const uscBand2 = (28700 - 12012) * 0.02;
    const uscBand3 = (70044 - 28700) * 0.03;
    const uscBand4 = (80000 - 70044) * 0.08;
    const expectedUsc = uscBand1 + uscBand2 + uscBand3 + uscBand4;
    expect(result.usc).toBeCloseTo(expectedUsc, 0);

    // PRSI on 80000 gross
    expect(result.prsi).toBeCloseTo(80000 * PRSI_SETTINGS.employeeRate, 0);
  });
});

// ---------------------------------------------------------------------------
// calculateMonthlyNetSalary
// ---------------------------------------------------------------------------
describe('calculateMonthlyNetSalary', () => {
  it('divides annual by 12', () => {
    expect(calculateMonthlyNetSalary(60000)).toBeCloseTo(5000, 2);
  });
});

// ---------------------------------------------------------------------------
// calculateBonusTaxBurden
// ---------------------------------------------------------------------------
describe('calculateBonusTaxBurden', () => {
  it('returns 0 when bonus percent is 0', () => {
    expect(calculateBonusTaxBurden(80000, 0, 10)).toBe(0);
  });

  it('returns 0 when bonus percent is negative', () => {
    expect(calculateBonusTaxBurden(80000, -5, 10)).toBe(0);
  });

  it('returns a positive tax burden for a standard bonus', () => {
    const tax = calculateBonusTaxBurden(80000, 10, 5);
    expect(tax).toBeGreaterThan(0);
  });

  it('bonus tax burden is the marginal increase in total tax', () => {
    const salary = 80000;
    const bonusPct = 15;
    const pensionPct = 5;
    const bonus = salary * (bonusPct / 100);

    // Manually compute total tax with and without bonus
    const salaryPension = salary * (pensionPct / 100);
    const taxableBase = calculateTaxableIncome(salary, salaryPension);
    const baseTax = calculatePayeTax(taxableBase) + calculateUSC(salary) + calculatePRSI(salary);

    const combinedGross = salary + bonus;
    const combinedPension = salaryPension + bonus * (pensionPct / 100);
    const taxableCombined = calculateTaxableIncome(combinedGross, combinedPension);
    const combinedTax =
      calculatePayeTax(taxableCombined) + calculateUSC(combinedGross) + calculatePRSI(combinedGross);

    const expectedBurden = Math.max(0, combinedTax - baseTax);
    expect(calculateBonusTaxBurden(salary, bonusPct, pensionPct)).toBeCloseTo(expectedBurden, 2);
  });
});

// ---------------------------------------------------------------------------
// calculateNetBonus
// ---------------------------------------------------------------------------
describe('calculateNetBonus', () => {
  it('returns zeros when bonus percent is 0', () => {
    const result = calculateNetBonus(80000, 0, 10);
    expect(result.grossBonus).toBe(0);
    expect(result.bonusNetSalary).toBe(0);
    expect(result.bonusTaxBurden).toBe(0);
    expect(result.bonusPensionContribution).toBe(0);
  });

  it('grossBonus equals salary * bonusPercent/100', () => {
    const result = calculateNetBonus(100000, 10, 5);
    expect(result.grossBonus).toBe(10000);
  });

  it('net bonus = gross - pension contribution - tax burden', () => {
    const result = calculateNetBonus(100000, 10, 5);
    expect(result.bonusNetSalary).toBeCloseTo(
      result.grossBonus - result.bonusPensionContribution - result.bonusTaxBurden,
      2,
    );
  });

  it('bonus pension contribution uses same pension percent', () => {
    const result = calculateNetBonus(80000, 10, 5);
    const grossBonus = 80000 * 0.1;
    expect(result.bonusPensionContribution).toBeCloseTo(grossBonus * 0.05, 2);
  });
});

// ---------------------------------------------------------------------------
// calculatePensionWithdrawalTax
// ---------------------------------------------------------------------------
describe('calculatePensionWithdrawalTax', () => {
  it('returns correct structure', () => {
    const result = calculatePensionWithdrawalTax(50000, true, 66);
    expect(result).toHaveProperty('grossWithdrawal', 50000);
    expect(result).toHaveProperty('payeTax');
    expect(result).toHaveProperty('usc');
    expect(result).toHaveProperty('prsi');
    expect(result).toHaveProperty('totalTax');
    expect(result).toHaveProperty('taxCredit');
    expect(result).toHaveProperty('netWithdrawal');
  });

  it('net withdrawal = gross - total tax', () => {
    const result = calculatePensionWithdrawalTax(50000, true, 66);
    expect(result.netWithdrawal).toBeCloseTo(result.grossWithdrawal - result.totalTax, 2);
  });

  it('includes PRSI when age < 66', () => {
    const result = calculatePensionWithdrawalTax(50000, true, 65);
    expect(result.prsi).toBeGreaterThan(0);
    expect(result.prsi).toBeCloseTo(50000 * PRSI_SETTINGS.employeeRate, 2);
  });

  it('excludes PRSI when age >= 66', () => {
    const result = calculatePensionWithdrawalTax(50000, true, 66);
    expect(result.prsi).toBe(0);
  });

  it('applies €245 age tax credit when in pension phase and age >= 65', () => {
    const result = calculatePensionWithdrawalTax(50000, true, 65);
    expect(result.taxCredit).toBe(245);
  });

  it('does not apply age tax credit when not in pension phase', () => {
    const result = calculatePensionWithdrawalTax(50000, false, 65);
    expect(result.taxCredit).toBe(0);
  });

  it('does not apply age tax credit when age < 65', () => {
    const result = calculatePensionWithdrawalTax(50000, true, 60);
    expect(result.taxCredit).toBe(0);
  });

  it('total tax is never negative', () => {
    const result = calculatePensionWithdrawalTax(100, true, 70);
    expect(result.totalTax).toBeGreaterThanOrEqual(0);
  });

  it('age 66+ has lower tax than age 65 (no PRSI, has age credit)', () => {
    const at65 = calculatePensionWithdrawalTax(80000, true, 65);
    const at66 = calculatePensionWithdrawalTax(80000, true, 66);
    expect(at66.totalTax).toBeLessThan(at65.totalTax);
  });
});

// ---------------------------------------------------------------------------
// calculateBrokerageCapitalGainsTax
// ---------------------------------------------------------------------------
describe('calculateBrokerageCapitalGainsTax', () => {
  it('applies 33% CGT on the full withdrawal', () => {
    const result = calculateBrokerageCapitalGainsTax(10000);
    expect(result.cgt).toBeCloseTo(10000 * CGT_RATE, 2);
  });

  it('net withdrawal = gross - CGT', () => {
    const result = calculateBrokerageCapitalGainsTax(10000);
    expect(result.netWithdrawal).toBeCloseTo(10000 - result.cgt, 2);
  });

  it('returns 0 CGT for 0 withdrawal', () => {
    const result = calculateBrokerageCapitalGainsTax(0);
    expect(result.cgt).toBe(0);
    expect(result.netWithdrawal).toBe(0);
  });

  it('CGT is exactly 33%', () => {
    const result = calculateBrokerageCapitalGainsTax(30000);
    expect(result.cgt).toBeCloseTo(30000 * 0.33, 2);
  });
});

// ---------------------------------------------------------------------------
// calculatePensionLumpSumTax
// ---------------------------------------------------------------------------
describe('calculatePensionLumpSumTax', () => {
  it('first €200,000 is tax-free', () => {
    const result = calculatePensionLumpSumTax(200000);
    expect(result.totalTax).toBe(0);
    expect(result.taxFreeAmount).toBe(200000);
    expect(result.netLumpSum).toBe(200000);
  });

  it('€200,001–€500,000 taxed at 20%', () => {
    const result = calculatePensionLumpSumTax(400000);
    // 200000 tax-free, 200000 at 20%
    expect(result.taxFreeAmount).toBe(200000);
    expect(result.standardRateAmount).toBe(200000);
    expect(result.standardRateTax).toBeCloseTo(200000 * 0.2, 2);
    expect(result.marginalAmount).toBe(0);
    expect(result.marginalTax).toBe(0);
    expect(result.totalTax).toBeCloseTo(40000, 2);
  });

  it('above €500,000 taxed at 40%', () => {
    const result = calculatePensionLumpSumTax(600000);
    // 200000 tax-free, 300000 at 20%, 100000 at 40%
    expect(result.taxFreeAmount).toBe(200000);
    expect(result.standardRateAmount).toBe(300000);
    expect(result.standardRateTax).toBeCloseTo(300000 * 0.2, 2);
    expect(result.marginalAmount).toBe(100000);
    expect(result.marginalTax).toBeCloseTo(100000 * 0.4, 2);
    expect(result.totalTax).toBeCloseTo(60000 + 40000, 2);
  });

  it('net lump sum = gross - total tax', () => {
    const result = calculatePensionLumpSumTax(700000);
    expect(result.netLumpSum).toBeCloseTo(700000 - result.totalTax, 2);
  });

  it('handles 0 lump sum', () => {
    const result = calculatePensionLumpSumTax(0);
    expect(result.totalTax).toBe(0);
    expect(result.netLumpSum).toBe(0);
  });

  it('handles exactly €500,000 boundary', () => {
    const result = calculatePensionLumpSumTax(500000);
    expect(result.taxFreeAmount).toBe(200000);
    expect(result.standardRateAmount).toBe(300000);
    expect(result.standardRateTax).toBeCloseTo(300000 * 0.2, 2);
    expect(result.marginalAmount).toBe(0);
    expect(result.totalTax).toBeCloseTo(60000, 2);
  });
});

// ---------------------------------------------------------------------------
// calculateDirtTax
// ---------------------------------------------------------------------------
describe('calculateDirtTax', () => {
  it('applies 33% on interest', () => {
    expect(calculateDirtTax(1000)).toBeCloseTo(1000 * DIRT_RATE, 2);
  });

  it('returns 0 for zero interest', () => {
    expect(calculateDirtTax(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getNetInterestAfterDirt
// ---------------------------------------------------------------------------
describe('getNetInterestAfterDirt', () => {
  it('returns interest minus DIRT', () => {
    expect(getNetInterestAfterDirt(1000)).toBeCloseTo(1000 * (1 - DIRT_RATE), 2);
  });

  it('returns 0 for zero interest', () => {
    expect(getNetInterestAfterDirt(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateExitTax
// ---------------------------------------------------------------------------
describe('calculateExitTax', () => {
  it('applies 38% exit tax on full gain (gainRatio=1)', () => {
    const result = calculateExitTax(10000, 1);
    expect(result.exitTax).toBeCloseTo(10000 * EXIT_TAX_RATE, 2);
    expect(result.netAmount).toBeCloseTo(10000 * (1 - EXIT_TAX_RATE), 2);
  });

  it('applies 38% on partial gain', () => {
    const result = calculateExitTax(10000, 0.5);
    expect(result.exitTax).toBeCloseTo(5000 * EXIT_TAX_RATE, 2);
  });

  it('returns 0 exit tax for zero gain ratio', () => {
    const result = calculateExitTax(10000, 0);
    expect(result.exitTax).toBe(0);
    expect(result.netAmount).toBe(10000);
  });

  it('returns 0 for zero amount', () => {
    const result = calculateExitTax(0, 1);
    expect(result.exitTax).toBe(0);
    expect(result.netAmount).toBe(0);
  });

  it('clamps gain ratio above 1 to 1', () => {
    const result = calculateExitTax(10000, 1.5);
    expect(result.exitTax).toBeCloseTo(10000 * EXIT_TAX_RATE, 2);
  });

  it('net amount = gross - exit tax', () => {
    const result = calculateExitTax(25000, 0.7);
    expect(result.netAmount).toBeCloseTo(25000 - result.exitTax, 2);
  });
});

// ---------------------------------------------------------------------------
// calculateBrokerageWithdrawalTax
// ---------------------------------------------------------------------------
describe('calculateBrokerageWithdrawalTax', () => {
  it('pure ETF portfolio: applies only exit tax', () => {
    const result = calculateBrokerageWithdrawalTax(10000, 50000, 0, 0.6, 0);
    // All withdrawal from ETF, 60% gain → exit tax on 6000
    expect(result.etfWithdrawal).toBeCloseTo(10000, 2);
    expect(result.stockWithdrawal).toBeCloseTo(0, 2);
    expect(result.etfExitTax).toBeCloseTo(6000 * EXIT_TAX_RATE, 2);
    expect(result.stockCgt).toBe(0);
    expect(result.totalTax).toBeCloseTo(result.etfExitTax, 2);
  });

  it('pure stock portfolio: applies only CGT', () => {
    const result = calculateBrokerageWithdrawalTax(10000, 0, 50000, 0, 0.6);
    expect(result.etfWithdrawal).toBeCloseTo(0, 2);
    expect(result.stockWithdrawal).toBeCloseTo(10000, 2);
    expect(result.etfExitTax).toBe(0);
    expect(result.stockCgt).toBeCloseTo(6000 * CGT_RATE, 2);
    expect(result.totalTax).toBeCloseTo(result.stockCgt, 2);
  });

  it('50/50 split: blended tax', () => {
    const result = calculateBrokerageWithdrawalTax(10000, 25000, 25000, 0.5, 0.5);
    // 5000 to ETF, 5000 to stock; each has 50% gain
    expect(result.etfWithdrawal).toBeCloseTo(5000, 2);
    expect(result.stockWithdrawal).toBeCloseTo(5000, 2);
    expect(result.etfExitTax).toBeCloseTo(2500 * EXIT_TAX_RATE, 2);
    expect(result.stockCgt).toBeCloseTo(2500 * CGT_RATE, 2);
    expect(result.totalTax).toBeCloseTo(result.etfExitTax + result.stockCgt, 2);
  });

  it('net withdrawal = gross - total tax', () => {
    const result = calculateBrokerageWithdrawalTax(20000, 30000, 70000, 0.8, 0.3);
    expect(result.netWithdrawal).toBeCloseTo(20000 - result.totalTax, 2);
  });

  it('returns zero tax for zero withdrawal', () => {
    const result = calculateBrokerageWithdrawalTax(0, 10000, 10000, 0.5, 0.5);
    expect(result.totalTax).toBe(0);
    expect(result.netWithdrawal).toBe(0);
  });

  it('returns zero tax when both balances are zero', () => {
    const result = calculateBrokerageWithdrawalTax(10000, 0, 0, 0, 0);
    expect(result.totalTax).toBe(0);
    expect(result.netWithdrawal).toBe(10000);
  });

  it('handles unequal split correctly (80/20)', () => {
    const result = calculateBrokerageWithdrawalTax(10000, 80000, 20000, 0.4, 0.4);
    // 8000 to ETF, 2000 to stock
    expect(result.etfWithdrawal).toBeCloseTo(8000, 2);
    expect(result.stockWithdrawal).toBeCloseTo(2000, 2);
    // ETF: 8000 * 0.4 * 0.38 = 1216
    expect(result.etfExitTax).toBeCloseTo(3200 * EXIT_TAX_RATE, 2);
    // Stock: 2000 * 0.4 * 0.33 = 264
    expect(result.stockCgt).toBeCloseTo(800 * CGT_RATE, 2);
  });
});
