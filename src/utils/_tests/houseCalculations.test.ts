import { describe, it, expect } from 'vitest';
import { calculateHouseMetrics } from '../houseCalculations';

describe('calculateHouseMetrics', () => {
  const BASE_PRICE = 387000;
  const ANNUAL_INCREASE = 7; // %

  // -----------------------------------------------------------------------
  // House price projection
  // -----------------------------------------------------------------------
  describe('house price projection', () => {
    it('returns base price when purchase age equals current age', () => {
      const result = calculateHouseMetrics(30, 30, 60000, 5000, BASE_PRICE, ANNUAL_INCREASE);
      expect(result.projectedHousePrice).toBeCloseTo(BASE_PRICE, 2);
    });

    it('grows house price by compound annual rate', () => {
      const years = 5;
      const result = calculateHouseMetrics(35, 30, 60000, 5000, BASE_PRICE, ANNUAL_INCREASE);
      const expected = BASE_PRICE * Math.pow(1 + ANNUAL_INCREASE / 100, years);
      expect(result.projectedHousePrice).toBeCloseTo(expected, 2);
    });

    it('handles 0% annual price increase', () => {
      const result = calculateHouseMetrics(40, 30, 60000, 5000, BASE_PRICE, 0);
      expect(result.projectedHousePrice).toBeCloseTo(BASE_PRICE, 2);
    });
  });

  // -----------------------------------------------------------------------
  // Mortgage calculation
  // -----------------------------------------------------------------------
  describe('mortgage calculation', () => {
    it('uses 4.5x multiplier with exemption (default)', () => {
      const result = calculateHouseMetrics(35, 30, 80000, 10000, BASE_PRICE, ANNUAL_INCREASE, true);
      // Mortgage = (80000 + 10000/2) * 4.5 = 85000 * 4.5 = 382500
      expect(result.projectedMortgage).toBeCloseTo(85000 * 4.5, 2);
    });

    it('uses 4x multiplier without exemption', () => {
      const result = calculateHouseMetrics(35, 30, 80000, 10000, BASE_PRICE, ANNUAL_INCREASE, false);
      expect(result.projectedMortgage).toBeCloseTo(85000 * 4, 2);
    });

    it('accounts for bonus at half value', () => {
      const result = calculateHouseMetrics(30, 30, 60000, 20000, BASE_PRICE, 0, true);
      // (60000 + 20000/2) * 4.5 = 70000 * 4.5 = 315000
      expect(result.projectedMortgage).toBeCloseTo(70000 * 4.5, 2);
    });
  });

  // -----------------------------------------------------------------------
  // Deposit computation
  // -----------------------------------------------------------------------
  describe('deposit computation', () => {
    it('deposit = max(0, house price - mortgage)', () => {
      const result = calculateHouseMetrics(35, 30, 80000, 10000, BASE_PRICE, ANNUAL_INCREASE);
      const expectedDeposit = Math.max(0, result.projectedHousePrice - result.projectedMortgage);
      expect(result.depositRequired).toBeCloseTo(expectedDeposit, 2);
    });

    it('deposit is always at least 10% of house price (minimum deposit rule)', () => {
      // Very high salary relative to house price — mortgage would exceed price without cap
      const result = calculateHouseMetrics(30, 30, 200000, 50000, 100000, 0, true);
      expect(result.depositRequired).toBeCloseTo(100000 * 0.1, 2);
    });

    it('deposit is positive when house price exceeds mortgage', () => {
      const result = calculateHouseMetrics(35, 30, 50000, 0, BASE_PRICE, ANNUAL_INCREASE);
      expect(result.depositRequired).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // LTV (Loan-to-Value)
  // -----------------------------------------------------------------------
  describe('LTV calculation', () => {
    it('LTV = (mortgage / house price) * 100', () => {
      const result = calculateHouseMetrics(35, 30, 80000, 10000, BASE_PRICE, ANNUAL_INCREASE);
      const expectedLtv = (result.projectedMortgage / result.projectedHousePrice) * 100;
      expect(result.loanToValuePercent).toBeCloseTo(expectedLtv, 2);
    });

    it('LTV is less than 100% for typical inputs', () => {
      const result = calculateHouseMetrics(35, 30, 60000, 5000, BASE_PRICE, ANNUAL_INCREASE);
      expect(result.loanToValuePercent).toBeLessThan(100);
    });

    it('LTV is capped at 90% even when income-based mortgage exceeds 90% of house price', () => {
      // Very high salary, low house price — uncapped mortgage would exceed house price
      const result = calculateHouseMetrics(30, 30, 200000, 50000, 100000, 0, true);
      expect(result.loanToValuePercent).toBeCloseTo(90, 2);
    });
  });

  // -----------------------------------------------------------------------
  // Return value shape
  // -----------------------------------------------------------------------
  describe('return value shape', () => {
    it('contains all expected fields', () => {
      const result = calculateHouseMetrics(35, 30, 80000, 10000, BASE_PRICE, ANNUAL_INCREASE);
      expect(result).toHaveProperty('projectedHousePrice');
      expect(result).toHaveProperty('projectedSalary');
      expect(result).toHaveProperty('projectedMortgage');
      expect(result).toHaveProperty('depositRequired');
      expect(result).toHaveProperty('loanToValuePercent');
    });

    it('projectedSalary equals the passed-in projected salary', () => {
      const result = calculateHouseMetrics(35, 30, 90000, 5000, BASE_PRICE, ANNUAL_INCREASE);
      expect(result.projectedSalary).toBe(90000);
    });
  });
});
