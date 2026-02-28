import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyWithDecimals,
  formatPercentage,
  formatCompactCurrency,
  getMonthsUntilYearEnd,
} from '../formatters';

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  it('formats positive integers with euro symbol', () => {
    const result = formatCurrency(1234);
    expect(result).toContain('€');
    expect(result).toContain('1,234');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('€');
    expect(result).toContain('0');
  });

  it('formats negative values', () => {
    const result = formatCurrency(-5000);
    expect(result).toContain('€');
    expect(result).toContain('5,000');
  });

  it('rounds to 0 decimal places', () => {
    const result = formatCurrency(1234.56);
    // Should not contain decimal point with digits
    expect(result).not.toMatch(/\.\d/);
  });

  it('formats large numbers with thousands separator', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1,000,000');
  });
});

// ---------------------------------------------------------------------------
// formatCurrencyWithDecimals
// ---------------------------------------------------------------------------
describe('formatCurrencyWithDecimals', () => {
  it('includes 2 decimal places', () => {
    const result = formatCurrencyWithDecimals(1234.5);
    expect(result).toMatch(/1,234\.50/);
  });

  it('formats zero with decimals', () => {
    const result = formatCurrencyWithDecimals(0);
    expect(result).toMatch(/0\.00/);
  });
});

// ---------------------------------------------------------------------------
// formatPercentage
// ---------------------------------------------------------------------------
describe('formatPercentage', () => {
  it('formats with 2 decimal places and % suffix', () => {
    expect(formatPercentage(5)).toBe('5.00%');
  });

  it('handles zero', () => {
    expect(formatPercentage(0)).toBe('0.00%');
  });

  it('handles fractional values', () => {
    expect(formatPercentage(4.2375)).toBe('4.24%');
  });
});

// ---------------------------------------------------------------------------
// formatCompactCurrency
// ---------------------------------------------------------------------------
describe('formatCompactCurrency', () => {
  it('formats thousands with K suffix', () => {
    expect(formatCompactCurrency(1500)).toBe('€1.5K');
  });

  it('formats millions with M suffix', () => {
    expect(formatCompactCurrency(2500000)).toBe('€2.5M');
  });

  it('formats billions with B suffix', () => {
    expect(formatCompactCurrency(1000000000)).toBe('€1.0B');
  });

  it('falls back to formatCurrency for < 1000', () => {
    const result = formatCompactCurrency(500);
    expect(result).toContain('€');
    expect(result).toContain('500');
  });

  it('handles exactly 1000', () => {
    expect(formatCompactCurrency(1000)).toBe('€1.0K');
  });

  it('handles exactly 1,000,000', () => {
    expect(formatCompactCurrency(1000000)).toBe('€1.0M');
  });
});

// ---------------------------------------------------------------------------
// getMonthsUntilYearEnd
// ---------------------------------------------------------------------------
describe('getMonthsUntilYearEnd', () => {
  it('returns a number between 0 and 12', () => {
    const months = getMonthsUntilYearEnd();
    expect(months).toBeGreaterThanOrEqual(0);
    expect(months).toBeLessThanOrEqual(12);
  });
});
