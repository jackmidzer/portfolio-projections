import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyWithDecimals,
  formatPercentage,
  formatCompactCurrency,
  deflate,
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

  it('handles negative thousands', () => {
    expect(formatCompactCurrency(-2500)).toBe('-€2.5K');
  });

  it('handles negative millions', () => {
    expect(formatCompactCurrency(-1500000)).toBe('-€1.5M');
  });
});

// ---------------------------------------------------------------------------
// deflate
// ---------------------------------------------------------------------------
describe('deflate', () => {
  it('returns amount unchanged when years <= 0', () => {
    expect(deflate(10000, 0, 3)).toBe(10000);
    expect(deflate(10000, -5, 3)).toBe(10000);
  });

  it('returns amount unchanged when inflationRate is 0', () => {
    expect(deflate(10000, 10, 0)).toBe(10000);
  });

  it('deflates by correct compound factor', () => {
    // 10000 / (1.03)^5
    const expected = 10000 / Math.pow(1.03, 5);
    expect(deflate(10000, 5, 3)).toBeCloseTo(expected, 4);
  });

  it('deflated value is less than original for positive inflation', () => {
    expect(deflate(50000, 10, 2)).toBeLessThan(50000);
  });

  it('works with fractional inflation rates', () => {
    const expected = 1000 / Math.pow(1.025, 1);
    expect(deflate(1000, 1, 2.5)).toBeCloseTo(expected, 4);
  });

  it('deflates to near zero for very long horizons and high inflation', () => {
    expect(deflate(100, 100, 20)).toBeCloseTo(100 / Math.pow(1.2, 100), 2);
  });
});
