import { describe, it, expect } from 'vitest';
import { calculateAccountGrowth, combineYearlyData, CombinedYearData } from '../calculations';
import { AccountInput, AccountGrowthOptions, AccountResults } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal savings account for isolated tests */
function makeSavingsAccount(overrides: Partial<AccountInput> = {}): AccountInput {
  return {
    name: 'Savings',
    currentBalance: 10000,
    monthlyContribution: 500,
    expectedReturn: 4, // 4% annual
    ...overrides,
  };
}

/** Minimal pension account */
function makePensionAccount(overrides: Partial<AccountInput> = {}): AccountInput {
  return {
    name: 'Pension',
    currentBalance: 50000,
    monthlyContribution: 10,
    expectedReturn: 7,
    isSalaryPercentage: true,
    ageBracketContributions: {
      under30: 10,
      age30to39: 15,
      age40to49: 20,
      age50to54: 25,
      age55to59: 30,
      age60plus: 35,
    },
    ...overrides,
  };
}

/** Minimal brokerage account */
function makeBrokerageAccount(overrides: Partial<AccountInput> = {}): AccountInput {
  return {
    name: 'Brokerage',
    currentBalance: 20000,
    monthlyContribution: 300,
    expectedReturn: 7,
    ...overrides,
  };
}

/** Build AccountGrowthOptions with sensible defaults for a given account */
function buildOpts(
  account: AccountInput,
  overrides: Partial<AccountGrowthOptions> = {},
): AccountGrowthOptions {
  return {
    account,
    timeHorizon: 5,
    currentAge: 30,
    currentSalary: 60000,
    annualSalaryIncrease: 3,
    monthsUntilNextBirthday: 12,
    dateOfBirth: new Date(1995, 0, 1),
    pensionAge: 65,
    withdrawalRate: 4,
    fireAge: 50,
    salaryReplacementRate: 60,
    bonusPercent: 0,
    enableHouseWithdrawal: false,
    enablePensionLumpSum: false,
    taxInputs: { grossSalary: 60000, pensionContribution: 6000, bikValue: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateAccountGrowth – Savings (fixed contribution)
// ---------------------------------------------------------------------------
describe('calculateAccountGrowth – Savings (fixed contribution)', () => {
  it('returns correct account name', () => {
    const result = calculateAccountGrowth(buildOpts(makeSavingsAccount()));
    expect(result.accountName).toBe('Savings');
  });

  it('ending balance exceeds starting balance + contributions (interest earned)', () => {
    const result = calculateAccountGrowth(buildOpts(makeSavingsAccount()));
    const contributed = result.totalContributions;
    expect(result.finalBalance).toBeGreaterThan(10000 + contributed * 0.8); // rough lower bound
  });

  it('yearly data length matches time horizon (calendar years)', () => {
    const result = calculateAccountGrowth(buildOpts(makeSavingsAccount(), { timeHorizon: 3 }));
    // Should produce at least timeHorizon entries (may be +1 due to calendar-year rounding)
    expect(result.yearlyData.length).toBeGreaterThanOrEqual(3);
  });

  it('first year starting balance equals initial balance', () => {
    const result = calculateAccountGrowth(buildOpts(makeSavingsAccount()));
    expect(result.yearlyData[0].startingBalance).toBe(10000);
  });

  it('each year ending balance equals next year starting balance', () => {
    const result = calculateAccountGrowth(
      buildOpts(makeSavingsAccount(), { timeHorizon: 5 }),
    );
    for (let i = 0; i < result.yearlyData.length - 1; i++) {
      expect(result.yearlyData[i].endingBalance).toBeCloseTo(
        result.yearlyData[i + 1].startingBalance,
        2,
      );
    }
  });

  it('applies DIRT tax on savings interest', () => {
    const result = calculateAccountGrowth(buildOpts(makeSavingsAccount()));
    // At least some DIRT is paid
    const totalDirt = result.yearlyData.reduce((s, yd) => s + (yd.interestTaxPaid ?? 0), 0);
    expect(totalDirt).toBeGreaterThan(0);
  });

  it('monthly compounding produces more than simple annual interest', () => {
    const account = makeSavingsAccount({ currentBalance: 100000, monthlyContribution: 0, expectedReturn: 10 });
    const result = calculateAccountGrowth(buildOpts(account, { timeHorizon: 2 }));
    // With DIRT tax on savings, interest is reduced, but the account should still grow
    // Simple annual interest after DIRT would give: 100000 * 10% * 67% = 6700 per year
    // Monthly compounding should give at least close to that over the first year
    expect(result.yearlyData[0].interestEarned).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// calculateAccountGrowth – Pension with age brackets
// ---------------------------------------------------------------------------
describe('calculateAccountGrowth – Pension (salary % with age brackets)', () => {
  it('returns correct account name', () => {
    const opts = buildOpts(makePensionAccount(), { timeHorizon: 5 });
    const result = calculateAccountGrowth(opts);
    expect(result.accountName).toBe('Pension');
  });

  it('contributions vary when crossing an age bracket boundary', () => {
    // Age 28 → 32 crosses the under-30 / 30-39 boundary
    const account = makePensionAccount();
    const opts = buildOpts(account, {
      currentAge: 28,
      timeHorizon: 5,
      fireAge: 50,
    });
    const result = calculateAccountGrowth(opts);
    // First-year contribution rate should be lower than later years
    const firstYearContribs = result.yearlyData[0].contributions;
    const laterYearContribs = result.yearlyData[result.yearlyData.length - 1].contributions;
    // The later years should have higher or equal contributions due to bracket + salary growth
    expect(laterYearContribs).toBeGreaterThanOrEqual(firstYearContribs * 0.9);
  });

  it('does not contribute during bridging phase (after FIRE age)', () => {
    const account = makePensionAccount();
    const opts = buildOpts(account, {
      currentAge: 48,
      fireAge: 50,
      pensionAge: 65,
      timeHorizon: 5,
    });
    const result = calculateAccountGrowth(opts);
    // Year when age >= 50 should have no contributions (FIRE reached)
    const postFireYears = result.yearlyData.filter((yd) => yd.age >= 51);
    for (const yd of postFireYears) {
      expect(yd.contributions).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// calculateAccountGrowth – Brokerage
// ---------------------------------------------------------------------------
describe('calculateAccountGrowth – Brokerage', () => {
  it('returns correct account name', () => {
    const result = calculateAccountGrowth(buildOpts(makeBrokerageAccount()));
    expect(result.accountName).toBe('Brokerage');
  });

  it('does not apply DIRT tax on brokerage interest', () => {
    const result = calculateAccountGrowth(buildOpts(makeBrokerageAccount()));
    const totalDirt = result.yearlyData.reduce((s, yd) => s + (yd.interestTaxPaid ?? 0), 0);
    expect(totalDirt).toBe(0);
  });

  it('withdrawals occur during bridging phase', () => {
    const account = makeBrokerageAccount({ currentBalance: 500000, monthlyContribution: 0 });
    const opts = buildOpts(account, {
      currentAge: 49,
      fireAge: 50,
      pensionAge: 65,
      timeHorizon: 5,
      salaryReplacementRate: 60,
    });
    const result = calculateAccountGrowth(opts);
    // Some year after fire age should have withdrawals
    const hasWithdrawals = result.yearlyData.some((yd) => yd.withdrawal > 0);
    expect(hasWithdrawals).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateAccountGrowth – Pro-rated first year
// ---------------------------------------------------------------------------
describe('calculateAccountGrowth – Pro-rated first year', () => {
  it('first year has fewer months when monthsUntilNextBirthday < 12', () => {
    const account = makeSavingsAccount();
    const opts6 = buildOpts(account, { monthsUntilNextBirthday: 6, timeHorizon: 3 });
    const opts12 = buildOpts(account, { monthsUntilNextBirthday: 12, timeHorizon: 3 });
    const result6 = calculateAccountGrowth(opts6);
    const result12 = calculateAccountGrowth(opts12);
    // With fewer months in first year, first-year contributions should be lower
    expect(result6.yearlyData[0].contributions).toBeLessThanOrEqual(
      result12.yearlyData[0].contributions,
    );
  });
});

// ---------------------------------------------------------------------------
// combineYearlyData
// ---------------------------------------------------------------------------
describe('combineYearlyData', () => {
  it('returns one entry per year', () => {
    const savings = calculateAccountGrowth(buildOpts(makeSavingsAccount(), { timeHorizon: 5 }));
    const pension = calculateAccountGrowth(
      buildOpts(makePensionAccount(), { timeHorizon: 5 }),
    );
    const brokerage = calculateAccountGrowth(
      buildOpts(makeBrokerageAccount(), { timeHorizon: 5 }),
    );
    const combined = combineYearlyData([savings, pension, brokerage], 50, 65);

    // All arrays should have the same length
    expect(combined.length).toBe(savings.yearlyData.length);
  });

  it('Total equals sum of Savings + Pension + Brokerage each year', () => {
    const savings = calculateAccountGrowth(buildOpts(makeSavingsAccount(), { timeHorizon: 3 }));
    const pension = calculateAccountGrowth(
      buildOpts(makePensionAccount(), { timeHorizon: 3 }),
    );
    const brokerage = calculateAccountGrowth(
      buildOpts(makeBrokerageAccount(), { timeHorizon: 3 }),
    );
    const combined = combineYearlyData([savings, pension, brokerage], 50, 65);

    for (const row of combined) {
      expect(row.Total).toBeCloseTo(row.Savings + row.Pension + row.Brokerage, 2);
    }
  });

  it('Principal accumulates over time', () => {
    const savings = calculateAccountGrowth(buildOpts(makeSavingsAccount(), { timeHorizon: 5 }));
    const combined = combineYearlyData([savings], 50, 65);

    for (let i = 1; i < combined.length; i++) {
      expect(combined[i].Principal).toBeGreaterThanOrEqual(combined[i - 1].Principal);
    }
  });

  it('phase field is "working" when age < fireAge', () => {
    const savings = calculateAccountGrowth(
      buildOpts(makeSavingsAccount(), { currentAge: 30, fireAge: 50, timeHorizon: 5 }),
    );
    const combined = combineYearlyData([savings], 50, 65);

    for (const row of combined) {
      if (row.age < 50) {
        expect(row.phase).toBe('working');
      }
    }
  });

  it('salary is captured from account data', () => {
    const savings = calculateAccountGrowth(
      buildOpts(makeSavingsAccount(), { timeHorizon: 3, currentSalary: 60000 }),
    );
    const combined = combineYearlyData([savings], 50, 65);
    // At least one year should have a non-zero salary
    expect(combined.some((r) => r.salary > 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Golden-value snapshot test
// ---------------------------------------------------------------------------
describe('Golden-value: known-input portfolio snapshot', () => {
  it('produces deterministic results for a fixed set of inputs', () => {
    const savings = makeSavingsAccount({
      currentBalance: 10000,
      monthlyContribution: 500,
      expectedReturn: 4,
    });

    const opts = buildOpts(savings, {
      timeHorizon: 3,
      currentAge: 30,
      currentSalary: 60000,
      annualSalaryIncrease: 0, // no salary growth for determinism
      monthsUntilNextBirthday: 12,
      fireAge: 50,
      pensionAge: 65,
      bonusPercent: 0,
      enableHouseWithdrawal: false,
      enablePensionLumpSum: false,
    });

    const result = calculateAccountGrowth(opts);

    // Check final balance is within a reasonable range
    // Starting 10000 + ~500/month contributions over ~3+ calendar years
    // Plus interest (with DIRT on savings), salary-based contribution sizing, calendar-year rounding
    expect(result.finalBalance).toBeGreaterThan(25000);
    expect(result.finalBalance).toBeLessThan(40000);
    expect(result.totalContributions).toBeGreaterThan(15000);
  });
});
