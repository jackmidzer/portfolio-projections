import { describe, it, expect } from 'vitest';
import {
  generateLifecycleEvents,
  getEventsForAge,
  getEventCategoryColor,
  EventCategory,
} from '../eventHelpers';
import type { PortfolioResults, AccountInput } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResults(overrides: Partial<PortfolioResults> = {}): PortfolioResults {
  return {
    accountResults: [],
    totalFinalBalance: 1_000_000,
    totalContributions: 200_000,
    totalInterest: 800_000,
    finalSalary: 80_000,
    bonusSalary: 8_000,
    monthsUntilNextBirthday: 6,
    fireAge: 50,
    pensionAge: 65,
    enablePensionLumpSum: false,
    enableHouseWithdrawal: false,
    ...overrides,
  };
}

function makePensionAccount(
  ageBracketContributions?: AccountInput['ageBracketContributions'],
): AccountInput {
  return {
    name: 'Pension',
    currentBalance: 50000,
    monthlyContribution: 10,
    expectedReturn: 7,
    ageBracketContributions,
  };
}

// ---------------------------------------------------------------------------
// generateLifecycleEvents – basic events
// ---------------------------------------------------------------------------
describe('generateLifecycleEvents – basic events', () => {
  it('includes FIRE event at fireAge', () => {
    const events = generateLifecycleEvents(makeResults({ fireAge: 50 }), [], 30, 80, {});
    const fire = events.find((e) => e.age === 50 && e.category === 'milestone');
    expect(fire).toBeDefined();
    expect(fire?.icon).toBe('fire');
  });

  it('includes pension drawdown event at pensionAge', () => {
    const events = generateLifecycleEvents(makeResults({ pensionAge: 65 }), [], 30, 80, {});
    const pension = events.find((e) => e.age === 65 && e.category === 'pension' && e.icon === 'pension');
    expect(pension).toBeDefined();
  });

  it('includes age-65 tax credit event', () => {
    const events = generateLifecycleEvents(makeResults(), [], 30, 80, {});
    const credit = events.find((e) => e.age === 65 && e.category === 'tax' && e.icon === 'shield');
    expect(credit).toBeDefined();
  });

  it('includes PRSI exemption event at 66', () => {
    const events = generateLifecycleEvents(makeResults(), [], 30, 80, {});
    const prsi = events.find((e) => e.age === 66 && e.category === 'tax' && e.icon === 'shield');
    expect(prsi).toBeDefined();
  });

  it('includes forced min withdrawal at 61 when pensionAge <= 61', () => {
    const events = generateLifecycleEvents(makeResults({ pensionAge: 60 }), [], 30, 80, {});
    const forced = events.find((e) => e.age === 61 && e.icon === 'alert');
    expect(forced).toBeDefined();
  });

  it('does NOT include forced min withdrawal at 61 when pensionAge > 61', () => {
    const events = generateLifecycleEvents(makeResults({ pensionAge: 65 }), [], 30, 80, {});
    const forced = events.filter((e) => e.age === 61 && e.icon === 'alert');
    // Pension age 65 > 61, so forced 4% should not appear
    expect(forced.length).toBe(0);
  });

  it('includes forced min withdrawal at 71 when pensionAge <= 71', () => {
    const events = generateLifecycleEvents(makeResults({ pensionAge: 65 }), [], 30, 80, {});
    const forced = events.find((e) => e.age === 71 && e.icon === 'alert');
    expect(forced).toBeDefined();
  });

  it('does NOT include events for ages outside [currentAge, targetAge]', () => {
    // targetAge = 40, so pension events at 65 should not appear
    const events = generateLifecycleEvents(makeResults({ fireAge: 38, pensionAge: 65 }), [], 30, 40, {});
    const pension = events.find((e) => e.age === 65);
    expect(pension).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateLifecycleEvents – house purchase
// ---------------------------------------------------------------------------
describe('generateLifecycleEvents – house purchase', () => {
  it('includes house deposit event when enabled and within age range', () => {
    const events = generateLifecycleEvents(
      makeResults({ enableHouseWithdrawal: true, houseWithdrawalAge: 35 }),
      [],
      30,
      80,
      { enableHouseWithdrawal: true, houseWithdrawalAge: 35 },
    );
    const house = events.find((e) => e.age === 35 && e.category === 'house');
    expect(house).toBeDefined();
    expect(house?.icon).toBe('house');
  });

  it('does NOT include house deposit event when disabled', () => {
    const events = generateLifecycleEvents(makeResults(), [], 30, 80, {
      enableHouseWithdrawal: false,
      houseWithdrawalAge: 35,
    });
    const house = events.find((e) => e.category === 'house');
    expect(house).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateLifecycleEvents – pension lump sum
// ---------------------------------------------------------------------------
describe('generateLifecycleEvents – pension lump sum', () => {
  it('includes pension lump sum event when enabled', () => {
    const events = generateLifecycleEvents(makeResults(), [], 30, 80, {
      enablePensionLumpSum: true,
      pensionLumpSumAge: 55,
      pensionLumpSumMaxAmount: 200000,
    });
    const lumpSum = events.find((e) => e.age === 55 && e.category === 'pension' && e.icon === 'wallet');
    expect(lumpSum).toBeDefined();
    expect(lumpSum?.title).toContain('lump sum');
  });

  it('does NOT include pension lump sum event when disabled', () => {
    const events = generateLifecycleEvents(makeResults(), [], 30, 80, {
      enablePensionLumpSum: false,
      pensionLumpSumAge: 55,
    });
    const lumpSum = events.find((e) => e.icon === 'wallet');
    expect(lumpSum).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateLifecycleEvents – state pension
// ---------------------------------------------------------------------------
describe('generateLifecycleEvents – state pension', () => {
  it('includes state pension event when enabled', () => {
    const events = generateLifecycleEvents(makeResults(), [], 30, 80, {
      includeStatePension: true,
      statePensionAge: 66,
      statePensionWeeklyAmount: 299.30,
    });
    const pension = events.find((e) => e.age === 66 && e.icon === 'clock');
    expect(pension).toBeDefined();
    expect(pension?.category).toBe('pension');
  });

  it('does NOT include state pension event when disabled', () => {
    const events = generateLifecycleEvents(makeResults(), [], 30, 80, {
      includeStatePension: false,
      statePensionAge: 66,
    });
    const pension = events.find((e) => e.icon === 'clock');
    expect(pension).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generateLifecycleEvents – deemed disposal (ETF)
// ---------------------------------------------------------------------------
describe('generateLifecycleEvents – deemed disposal', () => {
  it('includes deemed disposal events every 8 years for non-zero ETF allocation', () => {
    const brokerage: AccountInput = {
      name: 'Brokerage',
      currentBalance: 100000,
      monthlyContribution: 0,
      expectedReturn: 8,
      etfAllocationPercent: 50,
    };
    const events = generateLifecycleEvents(makeResults(), [brokerage], 30, 80, {
      etfAllocationPercent: 50,
    });
    const ddEvents = events.filter((e) => e.icon === 'tax' && e.title.includes('Deemed disposal'));
    // From age 38, 46, 54, 62, 70, 78 => 6 events within [30, 80]
    expect(ddEvents.length).toBeGreaterThanOrEqual(1);
    // Each event should be exactly 8 years apart
    if (ddEvents.length >= 2) {
      expect(ddEvents[1].age - ddEvents[0].age).toBe(8);
    }
  });

  it('does NOT include deemed disposal events for 0% ETF allocation (pure stocks)', () => {
    const brokerage: AccountInput = {
      name: 'Brokerage',
      currentBalance: 100000,
      monthlyContribution: 0,
      expectedReturn: 8,
      etfAllocationPercent: 0,
    };
    const events = generateLifecycleEvents(makeResults(), [brokerage], 30, 80, {
      etfAllocationPercent: 0,
    });
    const ddEvents = events.filter((e) => e.title.includes('Deemed disposal'));
    expect(ddEvents.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// generateLifecycleEvents – pension contribution bracket changes
// ---------------------------------------------------------------------------
describe('generateLifecycleEvents – pension bracket changes', () => {
  it('emits contribution bracket change events at age thresholds within working phase', () => {
    const pension = makePensionAccount({
      under30: 5, age30to39: 10, age40to49: 15,
      age50to54: 20, age55to59: 25, age60plus: 30,
    });
    // fireAge = 65 so bracket changes at 30, 40 etc. are during working phase
    const events = generateLifecycleEvents(
      makeResults({ fireAge: 65, pensionAge: 65 }),
      [pension],
      28,
      80,
      {},
    );
    const bracketEvents = events.filter((e) => e.category === 'contribution' && e.icon === 'trending');
    // Ages 30, 40 are within [28, 65) and have changing rates
    expect(bracketEvents.length).toBeGreaterThanOrEqual(2);
    const ages = bracketEvents.map((e) => e.age);
    expect(ages).toContain(30);
    expect(ages).toContain(40);
  });
});

// ---------------------------------------------------------------------------
// generateLifecycleEvents – event sort order
// ---------------------------------------------------------------------------
describe('generateLifecycleEvents – sort order', () => {
  it('events are returned in ascending age order', () => {
    const events = generateLifecycleEvents(makeResults(), [], 30, 80, {});
    for (let i = 1; i < events.length; i++) {
      expect(events[i].age).toBeGreaterThanOrEqual(events[i - 1].age);
    }
  });
});

// ---------------------------------------------------------------------------
// getEventsForAge
// ---------------------------------------------------------------------------
describe('getEventsForAge', () => {
  const allEvents = [
    { age: 35, title: 'A', description: '', category: 'milestone' as EventCategory, icon: 'fire' as const },
    { age: 40, title: 'B', description: '', category: 'tax' as EventCategory, icon: 'tax' as const },
    { age: 40, title: 'C', description: '', category: 'pension' as EventCategory, icon: 'pension' as const },
    { age: 50, title: 'D', description: '', category: 'withdrawal' as EventCategory, icon: 'alert' as const },
  ];

  it('returns only events at the specified age', () => {
    const result = getEventsForAge(allEvents, 40);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.age === 40)).toBe(true);
  });

  it('returns empty array when no events match', () => {
    expect(getEventsForAge(allEvents, 99)).toEqual([]);
  });

  it('returns single event for unique age', () => {
    expect(getEventsForAge(allEvents, 35)).toHaveLength(1);
    expect(getEventsForAge(allEvents, 35)[0].title).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// getEventCategoryColor
// ---------------------------------------------------------------------------
describe('getEventCategoryColor', () => {
  const categories: EventCategory[] = [
    'contribution', 'withdrawal', 'tax', 'milestone', 'pension', 'house',
  ];

  it.each(categories)('returns non-empty bg/text/border for %s category', (category) => {
    const colors = getEventCategoryColor(category);
    expect(colors.bg).toBeTruthy();
    expect(colors.text).toBeTruthy();
    expect(colors.border).toBeTruthy();
  });

  it('returns gray classes for unknown category', () => {
    // Cast unknown category to satisfy TS
    const colors = getEventCategoryColor('unknown' as EventCategory);
    expect(colors.bg).toContain('gray');
    expect(colors.text).toContain('gray');
  });

  it('contribution category returns emerald classes', () => {
    const colors = getEventCategoryColor('contribution');
    expect(colors.bg).toContain('emerald');
  });

  it('withdrawal category returns red classes', () => {
    const colors = getEventCategoryColor('withdrawal');
    expect(colors.bg).toContain('red');
  });

  it('house category returns orange classes', () => {
    const colors = getEventCategoryColor('house');
    expect(colors.bg).toContain('orange');
  });
});
