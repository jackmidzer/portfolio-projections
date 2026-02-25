/**
 * Phase detection utilities for portfolio lifecycle phases
 *
 * The financial lifecycle is divided into three distinct phases:
 * 1. Working Phase: age < earlyRetirementAge - earning salary, making contributions
 * 2. Early Retirement Phase: earlyRetirementAge <= age < pensionAge - no salary/contributions, brokerage withdrawals
 * 3. Pension Phase: age >= pensionAge - pension withdrawals
 */

/**
 * Determines if a given age falls within the Working phase
 * @param age - The person's current age
 * @param earlyRetirementAge - The age at which early retirement begins
 * @returns true if age < earlyRetirementAge
 */
export const isWorkingPhase = (age: number, earlyRetirementAge: number): boolean => {
  return age < earlyRetirementAge;
};

/**
 * Determines if a given age falls within the Early Retirement phase
 * @param age - The person's current age
 * @param earlyRetirementAge - The age at which early retirement begins
 * @param pensionAge - The age at which pension withdrawals begin
 * @returns true if earlyRetirementAge <= age < pensionAge
 */
export const isEarlyRetirementPhase = (
  age: number,
  earlyRetirementAge: number,
  pensionAge: number
): boolean => {
  return age >= earlyRetirementAge && age < pensionAge;
};

/**
 * Determines if a given age falls within the Pension phase
 * @param age - The person's current age
 * @param pensionAge - The age at which pension withdrawals begin
 * @returns true if age >= pensionAge
 */
export const isPensionPhase = (age: number, pensionAge: number): boolean => {
  return age >= pensionAge;
};

/**
 * Returns the name of the phase for a given age
 * @param age - The person's current age
 * @param earlyRetirementAge - The age at which early retirement begins
 * @param pensionAge - The age at which pension withdrawals begin
 * @returns The phase name: 'working', 'earlyRetirement', or 'pension'
 */
export const getPhaseType = (
  age: number,
  earlyRetirementAge: number,
  pensionAge: number
): 'working' | 'earlyRetirement' | 'pension' => {
  if (isWorkingPhase(age, earlyRetirementAge)) {
    return 'working';
  } else if (isEarlyRetirementPhase(age, earlyRetirementAge, pensionAge)) {
    return 'earlyRetirement';
  } else {
    return 'pension';
  }
};
