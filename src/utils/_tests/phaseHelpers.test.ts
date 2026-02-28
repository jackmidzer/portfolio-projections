import { describe, it, expect } from 'vitest';
import {
  isWorkingPhase,
  isBridgingPhase,
  isDrawdownPhase,
  getPhaseType,
} from '../phaseHelpers';

// ---------------------------------------------------------------------------
// isWorkingPhase
// ---------------------------------------------------------------------------
describe('isWorkingPhase', () => {
  it('returns true when age < fireAge', () => {
    expect(isWorkingPhase(30, 50)).toBe(true);
  });

  it('returns false when age === fireAge', () => {
    expect(isWorkingPhase(50, 50)).toBe(false);
  });

  it('returns false when age > fireAge', () => {
    expect(isWorkingPhase(55, 50)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isBridgingPhase
// ---------------------------------------------------------------------------
describe('isBridgingPhase', () => {
  it('returns true when fireAge <= age < pensionAge', () => {
    expect(isBridgingPhase(55, 50, 65)).toBe(true);
  });

  it('returns true at exact fireAge', () => {
    expect(isBridgingPhase(50, 50, 65)).toBe(true);
  });

  it('returns false when age < fireAge', () => {
    expect(isBridgingPhase(45, 50, 65)).toBe(false);
  });

  it('returns false when age >= pensionAge', () => {
    expect(isBridgingPhase(65, 50, 65)).toBe(false);
  });

  it('returns false when fireAge === pensionAge (no bridging window)', () => {
    expect(isBridgingPhase(50, 50, 50)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDrawdownPhase
// ---------------------------------------------------------------------------
describe('isDrawdownPhase', () => {
  it('returns true when age >= pensionAge', () => {
    expect(isDrawdownPhase(65, 65)).toBe(true);
    expect(isDrawdownPhase(70, 65)).toBe(true);
  });

  it('returns false when age < pensionAge', () => {
    expect(isDrawdownPhase(60, 65)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPhaseType
// ---------------------------------------------------------------------------
describe('getPhaseType', () => {
  it('returns "working" when age < fireAge', () => {
    expect(getPhaseType(30, 50, 65)).toBe('working');
  });

  it('returns "bridging" when fireAge <= age < pensionAge', () => {
    expect(getPhaseType(50, 50, 65)).toBe('bridging');
    expect(getPhaseType(60, 50, 65)).toBe('bridging');
  });

  it('returns "drawdown" when age >= pensionAge', () => {
    expect(getPhaseType(65, 50, 65)).toBe('drawdown');
    expect(getPhaseType(80, 50, 65)).toBe('drawdown');
  });

  it('transitions directly from working to drawdown when fireAge === pensionAge', () => {
    expect(getPhaseType(49, 50, 50)).toBe('working');
    expect(getPhaseType(50, 50, 50)).toBe('drawdown');
  });

  it('handles edge case where all ages are the same', () => {
    expect(getPhaseType(50, 50, 50)).toBe('drawdown');
  });
});
