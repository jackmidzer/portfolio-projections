import type { AccountInput, CareerBreak, Windfall } from '@/types';

// Mirrors the FormInputs fields needed for validation
export interface ValidatableInputs {
  dateOfBirth: string;
  targetAge: number | '';
  currentSalary: number | '';
  annualSalaryIncrease: number | '';
  bonusPercent: number | '';
  fireAge: number | '';
  pensionAge: number | '';
  withdrawalRate: number | '';
  salaryReplacementRate: number | '';
  enablePensionLumpSum: boolean;
  pensionLumpSumAge: number | '';
  pensionLumpSumMaxAmount: number | '';
  lumpSumToBrokerageRate: number | '';
  enableHouseWithdrawal: boolean;
  houseWithdrawalAge: number | '';
  houseDepositFromBrokerageRate: number | '';
  accounts: AccountInput[];
  // State Pension
  includeStatePension?: boolean;
  statePensionAge?: number | '';
  statePensionWeeklyAmount?: number | '';
  // Career Breaks
  careerBreaks?: CareerBreak[];
  // Windfalls
  windfalls?: Windfall[];
}

function getAgeFromDOB(dob: string): number | null {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Validates form inputs and returns a map of field name → error message.
 * An empty object means all inputs are valid.
 */
export function validateInputs(inputs: ValidatableInputs): Record<string, string> {
  const errors: Record<string, string> = {};

  // ─── Date of Birth ────────────────────────────────────────────────
  if (!inputs.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required';
  } else {
    const birthDate = new Date(inputs.dateOfBirth);
    if (isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      errors.dateOfBirth = 'Date of birth must be in the past';
    }
  }

  const currentAge = getAgeFromDOB(inputs.dateOfBirth);

  // ─── Target Age ───────────────────────────────────────────────────
  if (inputs.targetAge === '') {
    errors.targetAge = 'Plan until age is required';
  } else if (currentAge !== null && inputs.targetAge <= currentAge) {
    errors.targetAge = `Must be greater than your current age (${currentAge})`;
  } else if (inputs.targetAge > 150) {
    errors.targetAge = 'Target age cannot exceed 150';
  }

  // ─── Salary ───────────────────────────────────────────────────────
  if (inputs.currentSalary === '' || inputs.currentSalary <= 0) {
    errors.currentSalary = 'Annual salary must be greater than 0';
  }

  // ─── Annual Raise ─────────────────────────────────────────────────
  if (inputs.annualSalaryIncrease !== '' && (inputs.annualSalaryIncrease < 0 || inputs.annualSalaryIncrease > 20)) {
    errors.annualSalaryIncrease = 'Annual raise must be between 0% and 20%';
  }

  // ─── FIRE Age ─────────────────────────────────────────────────────
  if (inputs.fireAge === '') {
    errors.fireAge = 'FIRE age is required';
  } else if (currentAge !== null && inputs.fireAge <= currentAge) {
    errors.fireAge = `Must be greater than your current age (${currentAge})`;
  } else if (inputs.fireAge < 18 || inputs.fireAge > 100) {
    errors.fireAge = 'FIRE age must be between 18 and 100';
  }

  // ─── Pension Drawdown Age ─────────────────────────────────────────
  if (inputs.pensionAge === '') {
    errors.pensionAge = 'Pension drawdown age is required';
  } else if (inputs.pensionAge < 18 || inputs.pensionAge > 100) {
    errors.pensionAge = 'Pension age must be between 18 and 100';
  } else if (inputs.fireAge !== '' && inputs.pensionAge < inputs.fireAge) {
    errors.pensionAge = `Must be ≥ FIRE age (${inputs.fireAge})`;
  }

  // ─── Withdrawal Rate ──────────────────────────────────────────────
  if (inputs.withdrawalRate === '') {
    errors.withdrawalRate = 'Withdrawal rate is required';
  } else if (inputs.withdrawalRate <= 0 || inputs.withdrawalRate > 20) {
    errors.withdrawalRate = 'Must be between 0% and 20%';
  }

  // ─── Salary Replacement Rate ──────────────────────────────────────
  if (inputs.salaryReplacementRate === '') {
    errors.salaryReplacementRate = 'Salary replacement rate is required';
  } else if (inputs.salaryReplacementRate <= 0 || inputs.salaryReplacementRate > 100) {
    errors.salaryReplacementRate = 'Must be between 0% and 100%';
  }

  // ─── Pension Lump Sum ─────────────────────────────────────────────
  if (inputs.enablePensionLumpSum) {
    if (inputs.pensionLumpSumAge === '') {
      errors.pensionLumpSumAge = 'Lump sum age is required';
    } else if (
      inputs.pensionLumpSumAge < 50 ||
      (inputs.pensionAge !== '' && inputs.pensionLumpSumAge > inputs.pensionAge)
    ) {
      errors.pensionLumpSumAge = `Must be between 50 and pension age${inputs.pensionAge !== '' ? ` (${inputs.pensionAge})` : ''}`;
    }
    if (inputs.pensionLumpSumMaxAmount === '' || inputs.pensionLumpSumMaxAmount <= 0) {
      errors.pensionLumpSumMaxAmount = 'Max lump sum must be greater than 0';
    }
    if (inputs.lumpSumToBrokerageRate !== '' && (inputs.lumpSumToBrokerageRate < 0 || inputs.lumpSumToBrokerageRate > 100)) {
      errors.lumpSumToBrokerageRate = 'Lump sum brokerage allocation must be between 0% and 100%';
    }
  }

  // ─── House Withdrawal ─────────────────────────────────────────────
  if (inputs.enableHouseWithdrawal) {
    if (inputs.houseWithdrawalAge === '') {
      errors.houseWithdrawalAge = 'House purchase age is required';
    } else if (inputs.houseWithdrawalAge < 18 || inputs.houseWithdrawalAge > 100) {
      errors.houseWithdrawalAge = 'Must be between 18 and 100';
    }
    if (
      inputs.houseDepositFromBrokerageRate !== '' &&
      (inputs.houseDepositFromBrokerageRate < 0 || inputs.houseDepositFromBrokerageRate > 100)
    ) {
      errors.houseDepositFromBrokerageRate = 'Must be between 0% and 100%';
    }
  }

  // ─── Account Validations ──────────────────────────────────────────
  inputs.accounts.forEach((account, index) => {
    if (account.currentBalance < 0) {
      errors[`accounts.${index}.currentBalance`] = 'Balance cannot be negative';
    }
    if (account.expectedReturn < 0 || account.expectedReturn > 30) {
      errors[`accounts.${index}.expectedReturn`] = 'Return rate must be between 0% and 30%';
    }
    // Brokerage ETF allocation validation
    if (account.name === 'Brokerage' && account.etfAllocationPercent !== undefined) {
      if (account.etfAllocationPercent < 0 || account.etfAllocationPercent > 100) {
        errors[`accounts.${index}.etfAllocationPercent`] = 'ETF allocation must be between 0% and 100%';
      }
    }
  });

  // ─── Career Breaks ────────────────────────────────────────────────
  if (inputs.careerBreaks && inputs.careerBreaks.length > 0) {
    const targetAge = typeof inputs.targetAge === 'number' ? inputs.targetAge : 150;

    inputs.careerBreaks.forEach((cb, index) => {
      if (cb.fromAge >= cb.toAge) {
        errors[`careerBreaks.${index}.fromAge`] = 'Start age must be less than end age';
      }
      if (currentAge !== null && cb.fromAge < currentAge) {
        errors[`careerBreaks.${index}.fromAge`] = `Must be ≥ current age (${currentAge})`;
      }
      if (cb.toAge > targetAge) {
        errors[`careerBreaks.${index}.toAge`] = `Must be ≤ target age (${targetAge})`;
      }
      if (cb.salaryPercent < 0 || cb.salaryPercent > 100) {
        errors[`careerBreaks.${index}.salaryPercent`] = 'Salary % must be 0–100';
      }

      // Check overlap with other breaks
      for (let j = index + 1; j < inputs.careerBreaks!.length; j++) {
        const other = inputs.careerBreaks![j];
        if (cb.fromAge < other.toAge && other.fromAge < cb.toAge) {
          errors[`careerBreaks.${index}.overlap`] = 'Career break periods must not overlap';
          break;
        }
      }
    });
  }

  // ─── Windfalls ────────────────────────────────────────────────────
  if (inputs.windfalls && inputs.windfalls.length > 0) {
    const targetAge = typeof inputs.targetAge === 'number' ? inputs.targetAge : 150;

    inputs.windfalls.forEach((wf, index) => {
      if (currentAge !== null && wf.age <= currentAge) {
        errors[`windfalls.${index}.age`] = `Must be greater than current age (${currentAge})`;
      } else if (wf.age < 18 || wf.age > 100) {
        errors[`windfalls.${index}.age`] = 'Age must be between 18 and 100';
      } else if (wf.age > targetAge) {
        errors[`windfalls.${index}.age`] = `Must be ≤ target age (${targetAge})`;
      }
      if (wf.amount <= 0) {
        errors[`windfalls.${index}.amount`] = 'Amount must be greater than 0';
      }
    });
  }

  return errors;
}
