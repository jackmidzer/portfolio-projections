import { describe, it, expect } from 'vitest';
import { toBadgeVariant } from '../badgeVariant';

describe('toBadgeVariant', () => {
  it('returns "savings" for "Savings"', () => {
    expect(toBadgeVariant('Savings')).toBe('savings');
  });

  it('returns "pension" for "Pension"', () => {
    expect(toBadgeVariant('Pension')).toBe('pension');
  });

  it('returns "brokerage" for "Brokerage"', () => {
    expect(toBadgeVariant('Brokerage')).toBe('brokerage');
  });
});
