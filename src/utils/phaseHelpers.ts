/**
 * Phase detection utilities for portfolio lifecycle phases
 *
 * The financial lifecycle is divided into three distinct phases:
 * 1. Working Phase: age < fireAge - earning salary, making contributions
 * 2. Bridging Phase: fireAge <= age < pensionAge - no salary/contributions, brokerage withdrawals
 * 3. Drawdown Phase: age >= pensionAge - pension withdrawals
 */

/**
 * Determines if a given age falls within the Working phase
 * @param age - The person's current age
 * @param fireAge - The FIRE age at which working phase ends
 * @returns true if age < fireAge
 */
export const isWorkingPhase = (age: number, fireAge: number): boolean => {
  return age < fireAge;
};

/**
 * Determines if a given age falls within the Bridging phase
 * @param age - The person's current age
 * @param fireAge - The FIRE age at which the bridging phase begins
 * @param pensionAge - The age at which pension drawdown begins
 * @returns true if fireAge <= age < pensionAge
 */
export const isBridgingPhase = (
  age: number,
  fireAge: number,
  pensionAge: number
): boolean => {
  return age >= fireAge && age < pensionAge;
};

/**
 * Determines if a given age falls within the Drawdown phase
 * @param age - The person's current age
 * @param pensionAge - The age at which pension drawdown begins
 * @returns true if age >= pensionAge
 */
export const isDrawdownPhase = (age: number, pensionAge: number): boolean => {
  return age >= pensionAge;
};

/**
 * Returns the name of the phase for a given age
 * @param age - The person's current age
 * @param fireAge - The FIRE age at which the bridging phase begins
 * @param pensionAge - The age at which pension drawdown begins
 * @returns The phase name: 'working', 'bridging', or 'drawdown'
 */
export const getPhaseType = (
  age: number,
  fireAge: number,
  pensionAge: number
): 'working' | 'bridging' | 'drawdown' => {
  if (isWorkingPhase(age, fireAge)) {
    return 'working';
  } else if (isBridgingPhase(age, fireAge, pensionAge)) {
    return 'bridging';
  } else {
    return 'drawdown';
  }
};
