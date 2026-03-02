import { describe, it, expect } from 'vitest';
import { validateInputs, ValidatableInputs } from '../validation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fully-valid set of inputs that should produce zero errors. */
function validInputs(overrides: Partial<ValidatableInputs> = {}): ValidatableInputs {
  return {
    // Born 1990-01-01 → age ~36 in March 2026
    dateOfBirth: '1990-01-01',
    targetAge: 70,
    currentSalary: 60000,
    annualSalaryIncrease: 3,
    bonusPercent: 10,
    fireAge: 50,
    pensionAge: 60,
    withdrawalRate: 4,
    salaryReplacementRate: 70,
    enablePensionLumpSum: false,
    pensionLumpSumAge: '',
    pensionLumpSumMaxAmount: '',
    lumpSumToBrokerageRate: '',
    enableHouseWithdrawal: false,
    houseWithdrawalAge: '',
    houseDepositFromBrokerageRate: '',
    accounts: [
      { name: 'Savings', currentBalance: 10000, monthlyContribution: 500, expectedReturn: 3 },
    ],
    careerBreaks: [],
    windfalls: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
describe('validateInputs – valid inputs produce no errors', () => {
  it('returns empty errors for a fully valid input set', () => {
    expect(validateInputs(validInputs())).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// dateOfBirth
// ---------------------------------------------------------------------------
describe('validateInputs – dateOfBirth', () => {
  it('errors when dateOfBirth is empty', () => {
    const errors = validateInputs(validInputs({ dateOfBirth: '' }));
    expect(errors.dateOfBirth).toBeTruthy();
  });

  it('errors when dateOfBirth is in the future', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const errors = validateInputs(validInputs({ dateOfBirth: futureDate.toISOString().slice(0, 10) }));
    expect(errors.dateOfBirth).toBeTruthy();
  });

  it('errors when dateOfBirth is invalid string', () => {
    const errors = validateInputs(validInputs({ dateOfBirth: 'not-a-date' }));
    expect(errors.dateOfBirth).toBeTruthy();
  });

  it('no error for a valid past date', () => {
    const errors = validateInputs(validInputs({ dateOfBirth: '1990-06-15' }));
    expect(errors.dateOfBirth).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// targetAge
// ---------------------------------------------------------------------------
describe('validateInputs – targetAge', () => {
  it('errors when targetAge is empty string', () => {
    const errors = validateInputs(validInputs({ targetAge: '' }));
    expect(errors.targetAge).toBeTruthy();
  });

  it('errors when targetAge <= current age', () => {
    // Born 1990-01-01 → current age ~36; targetAge 30 is <= 36
    const errors = validateInputs(validInputs({ targetAge: 30 }));
    expect(errors.targetAge).toBeTruthy();
  });

  it('errors when targetAge > 150', () => {
    const errors = validateInputs(validInputs({ targetAge: 151 }));
    expect(errors.targetAge).toBeTruthy();
  });

  it('no error for targetAge = 150', () => {
    const errors = validateInputs(validInputs({ targetAge: 150 }));
    expect(errors.targetAge).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// currentSalary
// ---------------------------------------------------------------------------
describe('validateInputs – currentSalary', () => {
  it('errors when currentSalary is empty string', () => {
    const errors = validateInputs(validInputs({ currentSalary: '' }));
    expect(errors.currentSalary).toBeTruthy();
  });

  it('errors when currentSalary is 0', () => {
    const errors = validateInputs(validInputs({ currentSalary: 0 }));
    expect(errors.currentSalary).toBeTruthy();
  });

  it('errors when currentSalary is negative', () => {
    const errors = validateInputs(validInputs({ currentSalary: -100 }));
    expect(errors.currentSalary).toBeTruthy();
  });

  it('no error for positive salary', () => {
    const errors = validateInputs(validInputs({ currentSalary: 1 }));
    expect(errors.currentSalary).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// annualSalaryIncrease
// ---------------------------------------------------------------------------
describe('validateInputs – annualSalaryIncrease', () => {
  it('errors when annualSalaryIncrease < 0', () => {
    const errors = validateInputs(validInputs({ annualSalaryIncrease: -1 }));
    expect(errors.annualSalaryIncrease).toBeTruthy();
  });

  it('errors when annualSalaryIncrease > 20', () => {
    const errors = validateInputs(validInputs({ annualSalaryIncrease: 21 }));
    expect(errors.annualSalaryIncrease).toBeTruthy();
  });

  it('no error for empty string (optional)', () => {
    const errors = validateInputs(validInputs({ annualSalaryIncrease: '' }));
    expect(errors.annualSalaryIncrease).toBeUndefined();
  });

  it('no error for value within range', () => {
    const errors = validateInputs(validInputs({ annualSalaryIncrease: 5 }));
    expect(errors.annualSalaryIncrease).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// fireAge
// ---------------------------------------------------------------------------
describe('validateInputs – fireAge', () => {
  it('errors when fireAge is empty', () => {
    const errors = validateInputs(validInputs({ fireAge: '' }));
    expect(errors.fireAge).toBeTruthy();
  });

  it('errors when fireAge < 18', () => {
    const errors = validateInputs(validInputs({ fireAge: 17 }));
    expect(errors.fireAge).toBeTruthy();
  });

  it('errors when fireAge > 100', () => {
    const errors = validateInputs(validInputs({ fireAge: 101 }));
    expect(errors.fireAge).toBeTruthy();
  });

  it('errors when fireAge <= current age', () => {
    // DOB 1990-01-01 → ~36; fireAge 36 should fail
    const errors = validateInputs(validInputs({ fireAge: 36 }));
    expect(errors.fireAge).toBeTruthy();
  });

  it('no error for valid fireAge', () => {
    const errors = validateInputs(validInputs({ fireAge: 55 }));
    expect(errors.fireAge).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// pensionAge
// ---------------------------------------------------------------------------
describe('validateInputs – pensionAge', () => {
  it('errors when pensionAge is empty', () => {
    const errors = validateInputs(validInputs({ pensionAge: '' }));
    expect(errors.pensionAge).toBeTruthy();
  });

  it('errors when pensionAge < 18', () => {
    const errors = validateInputs(validInputs({ pensionAge: 17 }));
    expect(errors.pensionAge).toBeTruthy();
  });

  it('errors when pensionAge > 100', () => {
    const errors = validateInputs(validInputs({ pensionAge: 101 }));
    expect(errors.pensionAge).toBeTruthy();
  });

  it('errors when pensionAge < fireAge', () => {
    const errors = validateInputs(validInputs({ fireAge: 60, pensionAge: 55 }));
    expect(errors.pensionAge).toBeTruthy();
  });

  it('no error when pensionAge === fireAge', () => {
    const errors = validateInputs(validInputs({ fireAge: 50, pensionAge: 50 }));
    expect(errors.pensionAge).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// withdrawalRate
// ---------------------------------------------------------------------------
describe('validateInputs – withdrawalRate', () => {
  it('errors when withdrawalRate is empty', () => {
    const errors = validateInputs(validInputs({ withdrawalRate: '' }));
    expect(errors.withdrawalRate).toBeTruthy();
  });

  it('errors when withdrawalRate is 0', () => {
    const errors = validateInputs(validInputs({ withdrawalRate: 0 }));
    expect(errors.withdrawalRate).toBeTruthy();
  });

  it('errors when withdrawalRate > 20', () => {
    const errors = validateInputs(validInputs({ withdrawalRate: 21 }));
    expect(errors.withdrawalRate).toBeTruthy();
  });

  it('no error for withdrawal rate of 4', () => {
    const errors = validateInputs(validInputs({ withdrawalRate: 4 }));
    expect(errors.withdrawalRate).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// salaryReplacementRate
// ---------------------------------------------------------------------------
describe('validateInputs – salaryReplacementRate', () => {
  it('errors when salaryReplacementRate is empty', () => {
    const errors = validateInputs(validInputs({ salaryReplacementRate: '' }));
    expect(errors.salaryReplacementRate).toBeTruthy();
  });

  it('errors when salaryReplacementRate is 0', () => {
    const errors = validateInputs(validInputs({ salaryReplacementRate: 0 }));
    expect(errors.salaryReplacementRate).toBeTruthy();
  });

  it('errors when salaryReplacementRate > 100', () => {
    const errors = validateInputs(validInputs({ salaryReplacementRate: 101 }));
    expect(errors.salaryReplacementRate).toBeTruthy();
  });

  it('no error for 100%', () => {
    const errors = validateInputs(validInputs({ salaryReplacementRate: 100 }));
    expect(errors.salaryReplacementRate).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// enablePensionLumpSum validations
// ---------------------------------------------------------------------------
describe('validateInputs – pension lump sum', () => {
  it('errors when lump sum enabled but age is empty', () => {
    const errors = validateInputs(validInputs({
      enablePensionLumpSum: true,
      pensionLumpSumAge: '',
      pensionLumpSumMaxAmount: 200000,
    }));
    expect(errors.pensionLumpSumAge).toBeTruthy();
  });

  it('errors when lump sum age < 50', () => {
    const errors = validateInputs(validInputs({
      enablePensionLumpSum: true,
      pensionLumpSumAge: 49,
      pensionLumpSumMaxAmount: 200000,
    }));
    expect(errors.pensionLumpSumAge).toBeTruthy();
  });

  it('errors when lump sum age > pensionAge', () => {
    const errors = validateInputs(validInputs({
      enablePensionLumpSum: true,
      pensionAge: 60,
      pensionLumpSumAge: 65,
      pensionLumpSumMaxAmount: 200000,
    }));
    expect(errors.pensionLumpSumAge).toBeTruthy();
  });

  it('errors when max lump sum amount is 0', () => {
    const errors = validateInputs(validInputs({
      enablePensionLumpSum: true,
      pensionLumpSumAge: 55,
      pensionLumpSumMaxAmount: 0,
    }));
    expect(errors.pensionLumpSumMaxAmount).toBeTruthy();
  });

  it('errors when lumpSumToBrokerageRate is out of range', () => {
    const errors = validateInputs(validInputs({
      enablePensionLumpSum: true,
      pensionLumpSumAge: 55,
      pensionLumpSumMaxAmount: 200000,
      lumpSumToBrokerageRate: 101,
    }));
    expect(errors.lumpSumToBrokerageRate).toBeTruthy();
  });

  it('no error with all lump sum fields valid', () => {
    const errors = validateInputs(validInputs({
      enablePensionLumpSum: true,
      pensionAge: 65,
      pensionLumpSumAge: 55,
      pensionLumpSumMaxAmount: 200000,
      lumpSumToBrokerageRate: 100,
    }));
    expect(errors.pensionLumpSumAge).toBeUndefined();
    expect(errors.pensionLumpSumMaxAmount).toBeUndefined();
    expect(errors.lumpSumToBrokerageRate).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// enableHouseWithdrawal validations
// ---------------------------------------------------------------------------
describe('validateInputs – house withdrawal', () => {
  it('errors when house withdrawal enabled but age is empty', () => {
    const errors = validateInputs(validInputs({
      enableHouseWithdrawal: true,
      houseWithdrawalAge: '',
    }));
    expect(errors.houseWithdrawalAge).toBeTruthy();
  });

  it('errors when houseWithdrawalAge < 18', () => {
    const errors = validateInputs(validInputs({
      enableHouseWithdrawal: true,
      houseWithdrawalAge: 17,
    }));
    expect(errors.houseWithdrawalAge).toBeTruthy();
  });

  it('errors when houseWithdrawalAge > 100', () => {
    const errors = validateInputs(validInputs({
      enableHouseWithdrawal: true,
      houseWithdrawalAge: 101,
    }));
    expect(errors.houseWithdrawalAge).toBeTruthy();
  });

  it('errors when houseDepositFromBrokerageRate is out of range', () => {
    const errors = validateInputs(validInputs({
      enableHouseWithdrawal: true,
      houseWithdrawalAge: 35,
      houseDepositFromBrokerageRate: -1,
    }));
    expect(errors.houseDepositFromBrokerageRate).toBeTruthy();
  });

  it('no error with house withdrawal fields valid', () => {
    const errors = validateInputs(validInputs({
      enableHouseWithdrawal: true,
      houseWithdrawalAge: 35,
      houseDepositFromBrokerageRate: 50,
    }));
    expect(errors.houseWithdrawalAge).toBeUndefined();
    expect(errors.houseDepositFromBrokerageRate).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Account validations
// ---------------------------------------------------------------------------
describe('validateInputs – accounts', () => {
  it('errors when account balance is negative', () => {
    const errors = validateInputs(validInputs({
      accounts: [{ name: 'Savings', currentBalance: -1, monthlyContribution: 0, expectedReturn: 3 }],
    }));
    expect(errors['accounts.0.currentBalance']).toBeTruthy();
  });

  it('errors when expectedReturn < 0', () => {
    const errors = validateInputs(validInputs({
      accounts: [{ name: 'Savings', currentBalance: 0, monthlyContribution: 0, expectedReturn: -1 }],
    }));
    expect(errors['accounts.0.expectedReturn']).toBeTruthy();
  });

  it('errors when expectedReturn > 30', () => {
    const errors = validateInputs(validInputs({
      accounts: [{ name: 'Savings', currentBalance: 0, monthlyContribution: 0, expectedReturn: 31 }],
    }));
    expect(errors['accounts.0.expectedReturn']).toBeTruthy();
  });

  it('errors when brokerage ETF allocation is out of range', () => {
    const errors = validateInputs(validInputs({
      accounts: [{ name: 'Brokerage', currentBalance: 0, monthlyContribution: 0, expectedReturn: 7, etfAllocationPercent: 101 }],
    }));
    expect(errors['accounts.0.etfAllocationPercent']).toBeTruthy();
  });

  it('no error for valid brokerage ETF allocation', () => {
    const errors = validateInputs(validInputs({
      accounts: [{ name: 'Brokerage', currentBalance: 0, monthlyContribution: 0, expectedReturn: 7, etfAllocationPercent: 50 }],
    }));
    expect(errors['accounts.0.etfAllocationPercent']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Career breaks
// ---------------------------------------------------------------------------
describe('validateInputs – career breaks', () => {
  it('errors when fromAge >= toAge', () => {
    const errors = validateInputs(validInputs({
      careerBreaks: [{ id: 'c1', fromAge: 40, toAge: 40, salaryPercent: 0 }],
    }));
    expect(errors['careerBreaks.0.fromAge']).toBeTruthy();
  });

  it('errors when salary percent is out of range', () => {
    const errors = validateInputs(validInputs({
      careerBreaks: [{ id: 'c1', fromAge: 40, toAge: 45, salaryPercent: 101 }],
    }));
    expect(errors['careerBreaks.0.salaryPercent']).toBeTruthy();
  });

  it('errors when toAge exceeds targetAge', () => {
    const errors = validateInputs(validInputs({
      targetAge: 65,
      careerBreaks: [{ id: 'c1', fromAge: 60, toAge: 70, salaryPercent: 0 }],
    }));
    expect(errors['careerBreaks.0.toAge']).toBeTruthy();
  });

  it('errors on overlapping career breaks', () => {
    const errors = validateInputs(validInputs({
      careerBreaks: [
        { id: 'c1', fromAge: 40, toAge: 45, salaryPercent: 0 },
        { id: 'c2', fromAge: 43, toAge: 48, salaryPercent: 0 },
      ],
    }));
    expect(errors['careerBreaks.0.overlap']).toBeTruthy();
  });

  it('no error for valid non-overlapping career breaks', () => {
    const errors = validateInputs(validInputs({
      careerBreaks: [
        { id: 'c1', fromAge: 40, toAge: 42, salaryPercent: 0 },
        { id: 'c2', fromAge: 44, toAge: 46, salaryPercent: 50 },
      ],
    }));
    expect(errors['careerBreaks.0.fromAge']).toBeUndefined();
    expect(errors['careerBreaks.1.fromAge']).toBeUndefined();
    expect(errors['careerBreaks.0.overlap']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Windfalls
// ---------------------------------------------------------------------------
describe('validateInputs – windfalls', () => {
  it('errors when windfall age <= current age', () => {
    // Current age is ~36; age 30 should fail
    const errors = validateInputs(validInputs({
      windfalls: [{ id: 'w1', age: 30, amount: 10000, destination: 'Savings' }],
    }));
    expect(errors['windfalls.0.age']).toBeTruthy();
  });

  it('errors when windfall amount is 0', () => {
    const errors = validateInputs(validInputs({
      windfalls: [{ id: 'w1', age: 50, amount: 0, destination: 'Savings' }],
    }));
    expect(errors['windfalls.0.amount']).toBeTruthy();
  });

  it('errors when windfall age > 100', () => {
    const errors = validateInputs(validInputs({
      windfalls: [{ id: 'w1', age: 101, amount: 1000, destination: 'Savings' }],
    }));
    expect(errors['windfalls.0.age']).toBeTruthy();
  });

  it('errors when windfall age > targetAge', () => {
    const errors = validateInputs(validInputs({
      targetAge: 60,
      windfalls: [{ id: 'w1', age: 65, amount: 1000, destination: 'Savings' }],
    }));
    expect(errors['windfalls.0.age']).toBeTruthy();
  });

  it('no error for valid windfall', () => {
    const errors = validateInputs(validInputs({
      windfalls: [{ id: 'w1', age: 50, amount: 50000, destination: 'Brokerage' }],
    }));
    expect(errors['windfalls.0.age']).toBeUndefined();
    expect(errors['windfalls.0.amount']).toBeUndefined();
  });
});
