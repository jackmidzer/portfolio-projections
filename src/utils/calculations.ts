import { AccountInput, AccountResults, YearlyBreakdown, PortfolioResults, AgeBracketContributions, EmployerAgeBracketContributions, MonthlyBreakdown, MilestoneSnapshot, PensionLumpSumTaxBreakdown, AccountGrowthOptions, PortfolioGrowthOptions, TaxInputs } from '../types';
import { calculateNetSalary, calculatePensionWithdrawalTax, calculateBrokerageWithdrawalTax, calculateBonusTaxBurden, calculateNetBonus, calculateDirtTax, calculatePensionLumpSumTax, calculateExitTax, calculatePrsiSummary } from './taxCalculations';
import { isBridgingPhase, isDrawdownPhase, getPhaseType } from './phaseHelpers';
import { DEEMED_DISPOSAL_PERIOD_YEARS, CGT_ANNUAL_EXEMPTION, STATE_PENSION_WEEKLY, PENSION_LUMP_SUM_MAX_FRACTION } from '../constants/irishTaxRates2026';
import { DEEMED_DISPOSAL_PERIOD_YEARS, CGT_ANNUAL_EXEMPTION, STATE_PENSION_WEEKLY, PENSION_LUMP_SUM_MAX_FRACTION } from '../constants/irishTaxRates2026';

/**
 * Get the contribution percentage for a given age from age bracket contributions
 */
export function getAgeBracketPercentage(age: number, brackets: AgeBracketContributions): number {
  if (age < 30) return brackets.under30;
  if (age < 40) return brackets.age30to39;
  if (age < 50) return brackets.age40to49;
  if (age < 55) return brackets.age50to54;
  if (age < 60) return brackets.age55to59;
  return brackets.age60plus;
}

/**
 * Get the employer contribution percentage for a given age from employer age bracket contributions
 */
export function getEmployerAgeBracketPercentage(age: number, brackets: EmployerAgeBracketContributions): number {
  if (age < 25) return brackets.under25;
  if (age < 30) return brackets.age25to29;
  if (age < 35) return brackets.age30to34;
  if (age < 40) return brackets.age35to39;
  if (age < 45) return brackets.age40to44;
  if (age < 50) return brackets.age45to49;
  if (age < 55) return brackets.age50to54;
  return brackets.age55plus;
}

/**
 * Extract a milestone snapshot at a specific age from account results
 * Returns undefined if the age is not reached
 */
function extractMilestoneSnapshot(accountResults: AccountResults[], targetAge: number): MilestoneSnapshot | undefined {
  // Find the first year at or after the target age across all accounts
  let snapshotYearIndex = -1;
  
  for (const result of accountResults) {
    for (let i = 0; i < result.yearlyData.length; i++) {
      if (result.yearlyData[i].age >= targetAge) {
        snapshotYearIndex = i;
        break;
      }
    }
    if (snapshotYearIndex >= 0) break;
  }
  
  // If target age was not reached, return undefined
  if (snapshotYearIndex < 0) {
    return undefined;
  }
  
  // Build the snapshot data at this year
  const accountBalances = accountResults.map((result) => {
    const yearData = result.yearlyData[snapshotYearIndex];
    
    // Calculate cumulative contributions and interest up to this year
    let cumulativeContributions = 0;
    let cumulativeInterest = 0;
    for (let i = 0; i <= snapshotYearIndex; i++) {
      cumulativeContributions += result.yearlyData[i].contributions;
      cumulativeInterest += result.yearlyData[i].interestEarned;
    }
    
    return {
      accountName: result.accountName,
      finalBalance: yearData.endingBalance,
      totalContributions: cumulativeContributions,
      totalInterest: cumulativeInterest,
    };
  });
  
  // Calculate cumulative totals up to this year
  let totalBalance = 0;
  let totalContributions = 0;
  let totalInterest = 0;
  
  for (const result of accountResults) {
    // Sum contributions across all years up to and including snapshotYearIndex
    for (let i = 0; i <= snapshotYearIndex; i++) {
      totalContributions += result.yearlyData[i].contributions;
    }
    // Add final balance at snapshot year
    totalBalance += result.yearlyData[snapshotYearIndex].endingBalance;
    // Interest is calculated as ending balance - starting balance - contributions + withdrawals
    for (let i = 0; i <= snapshotYearIndex; i++) {
      totalInterest += result.yearlyData[i].interestEarned;
    }
  }
  
  const age = accountResults[0]?.yearlyData[snapshotYearIndex]?.age || targetAge;
  
  return {
    age,
    accountBalances,
    totalBalance,
    totalContributions,
    totalInterest,
  };
}

// ────────────────────────────────────────────────────────────────────
// Extracted helper functions for calculateAccountGrowth
// Each is a pure function that encapsulates one concern from the loop.
// ────────────────────────────────────────────────────────────────────

interface SalaryContext {
  salaryAtMonth: number;
  careerBreakSalaryPercent: number;
  isOnFullCareerBreak: boolean;
}

/**
 * Resolve the effective salary for a given month, accounting for career breaks.
 */
export function resolveSalaryForMonth(
  currentSalary: number | undefined,
  annualSalaryIncrease: number | undefined,
  januarysSeen: number,
  ageAtMonth: number,
  careerBreaks?: import('../types').CareerBreak[],
): SalaryContext {
  let salaryAtMonth = currentSalary || 0;
  if (currentSalary && annualSalaryIncrease !== undefined) {
    salaryAtMonth = currentSalary * Math.pow(1 + annualSalaryIncrease / 100, januarysSeen);
  }

  let careerBreakSalaryPercent = 100;
  if (careerBreaks && careerBreaks.length > 0) {
    for (const cb of careerBreaks) {
      if (ageAtMonth >= cb.fromAge && ageAtMonth < cb.toAge) {
        careerBreakSalaryPercent = cb.salaryPercent;
        break;
      }
    }
    salaryAtMonth = salaryAtMonth * (careerBreakSalaryPercent / 100);
  }

  return {
    salaryAtMonth,
    careerBreakSalaryPercent,
    isOnFullCareerBreak: careerBreakSalaryPercent === 0,
  };
}

interface MonthlyIncomeContext {
  monthlyNetSalary: number;
  baseMonthlyNetSalary: number;
  monthlyTax: number;
  monthlyGrossIncome: number;
  monthlyPensionDeduction: number;
}

/**
 * Compute monthly net salary, tax, and pension deduction for the current month.
 */
function resolveMonthlyTaxAndIncome(
  salaryAtMonth: number,
  taxInputs: TaxInputs | undefined,
  pensionAgeBracketContributions: AgeBracketContributions | undefined,
  ageAtStartOfCurrentYear: number,
  taxBandMultiplier: number,
  monthDate: Date,
  bonusPercent: number | undefined,
): MonthlyIncomeContext {
  let monthlyNetSalary = 0;
  let baseMonthlyNetSalary = 0;
  let monthlyTax = 0;
  let monthlyGrossIncome = 0;
  let monthlyPensionDeduction = 0;

  if (salaryAtMonth > 0 && taxInputs) {
    let dynamicPensionContribution = taxInputs.pensionContribution;
    if (pensionAgeBracketContributions && salaryAtMonth > 0) {
      const pensionPercent = getAgeBracketPercentage(ageAtStartOfCurrentYear, pensionAgeBracketContributions);
      dynamicPensionContribution = (salaryAtMonth * pensionPercent) / 100;
    }

    const annualTaxResult = calculateNetSalary({
      grossSalary: salaryAtMonth,
      pensionContribution: dynamicPensionContribution,
      bikValue: taxInputs.bikValue || 0,
      claimRentRelief: taxInputs.claimRentRelief,
      claimMedicalInsurance: taxInputs.claimMedicalInsurance,
      taxBandMultiplier,
    });

    const baseMonthlyTax = (annualTaxResult.payeTax + annualTaxResult.usc + annualTaxResult.prsi) / 12;
    const baseMonthlySalaryPension = dynamicPensionContribution / 12;

    const isDecemberMonth = monthDate.getMonth() === 11;
    const hasBonusPercent = bonusPercent !== undefined && bonusPercent > 0;

    monthlyGrossIncome = salaryAtMonth / 12;
    monthlyPensionDeduction = baseMonthlySalaryPension;
    monthlyTax = baseMonthlyTax;
    baseMonthlyNetSalary = (salaryAtMonth / 12) - baseMonthlyTax - baseMonthlySalaryPension;

    if (isDecemberMonth && hasBonusPercent) {
      const pensionPercent = pensionAgeBracketContributions
        ? getAgeBracketPercentage(ageAtStartOfCurrentYear, pensionAgeBracketContributions)
        : (dynamicPensionContribution / salaryAtMonth) * 100;

      const bonusTaxBurden = calculateBonusTaxBurden(
        salaryAtMonth,
        bonusPercent!,
        pensionPercent,
        taxInputs.bikValue || 0,
        taxInputs.claimRentRelief,
        taxInputs.claimMedicalInsurance,
        taxBandMultiplier,
      );

      monthlyTax = baseMonthlyTax + bonusTaxBurden;
      const bonusAmount = salaryAtMonth * (bonusPercent! / 100);
      monthlyGrossIncome = salaryAtMonth / 12 + bonusAmount;
      const bonusPensionDeduction = (bonusAmount * pensionPercent) / 100;
      monthlyPensionDeduction = baseMonthlySalaryPension + bonusPensionDeduction;
    }

    monthlyNetSalary = monthlyGrossIncome - monthlyTax - monthlyPensionDeduction;
  } else if (salaryAtMonth > 0) {
    monthlyGrossIncome = salaryAtMonth / 12;
    monthlyNetSalary = salaryAtMonth / 12;
    baseMonthlyNetSalary = salaryAtMonth / 12;
  }

  return { monthlyNetSalary, baseMonthlyNetSalary, monthlyTax, monthlyGrossIncome, monthlyPensionDeduction };
}

/**
 * Calculate monthly contribution for a given account during the working phase.
 */
function resolveMonthlyContribution(
  account: import('../types').AccountInput,
  month: number,
  fireYearStartMonth: number,
  isOnFullCareerBreak: boolean,
  salaryAtMonth: number,
  currentSalary: number | undefined,
  annualSalaryIncrease: number | undefined,
  ageAtStartOfCurrentYear: number,
  baseMonthlyNetSalary: number,
  isPensionAccount: boolean,
  monthDate: Date,
  bonusPercent: number | undefined,
  netBonusValue: number | undefined,
): number {
  let monthlyContribution = 0;
  if (month < fireYearStartMonth && !isOnFullCareerBreak) {
    if (account.isSalaryPercentage && currentSalary && annualSalaryIncrease !== undefined) {
      let contributionPercentage = account.monthlyContribution;
      if (account.ageBracketContributions) {
        contributionPercentage = getAgeBracketPercentage(ageAtStartOfCurrentYear, account.ageBracketContributions);
      }
      const contributionBase = isPensionAccount ? (salaryAtMonth / 12) : baseMonthlyNetSalary;
      monthlyContribution = contributionBase * (contributionPercentage / 100);

      if (account.employerAgeBracketContributions) {
        const employerPercent = getEmployerAgeBracketPercentage(ageAtStartOfCurrentYear, account.employerAgeBracketContributions);
        if (employerPercent > 0) {
          monthlyContribution += (salaryAtMonth / 12) * (employerPercent / 100);
        }
      }
    } else {
      monthlyContribution = account.monthlyContribution;
    }

    const isDecember = monthDate.getMonth() === 11;
    if (isDecember && bonusPercent !== undefined && bonusPercent > 0 && account.bonusContributionPercent !== undefined) {
      const isSavingsOrBrokerage = account.name === 'Savings' || account.name === 'Brokerage';
      const annualBonus = isSavingsOrBrokerage && netBonusValue !== undefined ? netBonusValue : salaryAtMonth * (bonusPercent / 100);

      let bonusContributionPercent: number | undefined =
        typeof account.bonusContributionPercent === 'number' ? account.bonusContributionPercent : undefined;
      if (account.bonusContributionPercent === 'age-bracket' && account.ageBracketContributions) {
        bonusContributionPercent = getAgeBracketPercentage(ageAtStartOfCurrentYear, account.ageBracketContributions);
      }
      if (bonusContributionPercent !== undefined && bonusContributionPercent > 0) {
        monthlyContribution += annualBonus * (bonusContributionPercent / 100);
      }
    }
  }
  return monthlyContribution;
}

interface DeemedDisposalResult {
  tax: number;
  etfBalance: number;
  etfCostBasis: number;
  currentBalance: number;
  counter: number;
  cumulativeTax: number;
}

/**
 * Apply deemed disposal (8-year exit tax) on the ETF sub-balance.
 * Returns updated balances and tax amounts.
 */
function applyDeemedDisposal(
  etfBalance: number,
  etfCostBasis: number,
  currentBalance: number,
  counter: number,
  periodMonths: number,
  cumulativeTax: number,
): DeemedDisposalResult {
  let tax = 0;
  counter++;
  if (counter >= periodMonths) {
    const etfGain = Math.max(0, etfBalance - etfCostBasis);
    if (etfGain > 0) {
      const ddResult = calculateExitTax(etfGain, 1);
      tax = ddResult.exitTax;
      etfBalance -= tax;
      currentBalance -= tax;
      etfCostBasis = etfBalance;
      cumulativeTax += tax;
    }
    counter = 0;
  }
  return { tax, etfBalance, etfCostBasis, currentBalance, counter, cumulativeTax };
}

interface WithdrawalTaxResult {
  withdrawalTax: number;
  withdrawalNetAmount: number;
  withdrawalPhase: 'lumpSum' | 'bridging' | 'drawdown' | undefined;
  cumulativeExitTaxOnWithdrawals: number;
  cgtExemptionUsedThisYear: number;
}

/**
 * Compute withdrawal tax based on account type, phase, and current state.
 */
function resolveWithdrawalTax(
  monthWithdrawal: number,
  isPensionAccount: boolean,
  isBrokerageAccount: boolean,
  ageAtMonth: number,
  pensionLumpSumAgeValue: number,
  isInDrawdownPhase: boolean,
  isInBridgingPhase: boolean,
  enableHouseWithdrawal: boolean | undefined,
  houseWithdrawalAge: number | undefined,
  lumpSumContribution: number,
  preWithdrawalEtfBalance: number,
  preWithdrawalStockBalance: number,
  etfGainRatio: number,
  stockGainRatio: number,
  cgtExemptionUsedThisYear: number,
  cumulativeExitTaxOnWithdrawals: number,
  taxBandMultiplier: number,
): WithdrawalTaxResult {
  let withdrawalTax = 0;
  let withdrawalNetAmount = monthWithdrawal;
  let withdrawalPhase: 'lumpSum' | 'bridging' | 'drawdown' | undefined;

  if (monthWithdrawal > 0) {
    if (isPensionAccount && ageAtMonth >= pensionLumpSumAgeValue && ageAtMonth < (pensionLumpSumAgeValue + 1)) {
      withdrawalPhase = 'lumpSum';
      withdrawalTax = 0;
      withdrawalNetAmount = monthWithdrawal;
    } else if (!isPensionAccount && ageAtMonth >= pensionLumpSumAgeValue && ageAtMonth < (pensionLumpSumAgeValue + 1) && lumpSumContribution > 0) {
      withdrawalPhase = 'lumpSum';
      withdrawalTax = 0;
      withdrawalNetAmount = monthWithdrawal;
    } else if (isPensionAccount && isInDrawdownPhase) {
      withdrawalPhase = 'drawdown';
      const taxResult = calculatePensionWithdrawalTax(monthWithdrawal, true, ageAtMonth, taxBandMultiplier);
      withdrawalTax = taxResult.totalTax;
      withdrawalNetAmount = taxResult.netWithdrawal;
    } else if (isBrokerageAccount && isInBridgingPhase) {
      withdrawalPhase = 'bridging';
      const remainingCgtExemption = Math.max(0, CGT_ANNUAL_EXEMPTION - cgtExemptionUsedThisYear);
      const taxResult = calculateBrokerageWithdrawalTax(monthWithdrawal, preWithdrawalEtfBalance, preWithdrawalStockBalance, etfGainRatio, stockGainRatio, remainingCgtExemption);
      withdrawalTax = taxResult.totalTax;
      withdrawalNetAmount = taxResult.netWithdrawal;
      cumulativeExitTaxOnWithdrawals += taxResult.etfExitTax;
      cgtExemptionUsedThisYear += taxResult.cgtExemptionUsed;
    } else if (enableHouseWithdrawal && houseWithdrawalAge !== undefined && ageAtMonth >= houseWithdrawalAge && ageAtMonth < (houseWithdrawalAge + 1)) {
      if (isBrokerageAccount) {
        withdrawalPhase = 'bridging';
        const remainingCgtExemption = Math.max(0, CGT_ANNUAL_EXEMPTION - cgtExemptionUsedThisYear);
        const taxResult = calculateBrokerageWithdrawalTax(monthWithdrawal, preWithdrawalEtfBalance, preWithdrawalStockBalance, etfGainRatio, stockGainRatio, remainingCgtExemption);
        withdrawalTax = taxResult.totalTax;
        withdrawalNetAmount = taxResult.netWithdrawal;
        cumulativeExitTaxOnWithdrawals += taxResult.etfExitTax;
        cgtExemptionUsedThisYear += taxResult.cgtExemptionUsed;
      } else {
        withdrawalPhase = undefined;
        withdrawalTax = 0;
        withdrawalNetAmount = monthWithdrawal;
      }
    }
  }

  return { withdrawalTax, withdrawalNetAmount, withdrawalPhase, cumulativeExitTaxOnWithdrawals, cgtExemptionUsedThisYear };
}

/**
 * Aggregate an array of monthly data into yearly breakdowns grouped by calendar year.
 */
function aggregateMonthlyToYearly(
  allMonthlyData: MonthlyBreakdown[],
  currentAge: number,
  firstYearMonths: number,
  finalBalance: number,
): YearlyBreakdown[] {
  const yearlyData: YearlyBreakdown[] = [];
  const monthsByYear = new Map<number, typeof allMonthlyData>();

  allMonthlyData.forEach(monthData => {
    const yearMatch = monthData.monthYear.match(/\d{4}$/);
    const calendarYear = yearMatch ? parseInt(yearMatch[0], 10) : 2026;
    if (!monthsByYear.has(calendarYear)) {
      monthsByYear.set(calendarYear, []);
    }
    monthsByYear.get(calendarYear)!.push(monthData);
  });

  const sortedYears = Array.from(monthsByYear.keys()).sort((a, b) => a - b);

  sortedYears.forEach(calendarYear => {
    const yearMonthlyData = monthsByYear.get(calendarYear) || [];
    const renumberedMonthlyData = yearMonthlyData.map((m, index) => ({
      ...m,
      month: index + 1,
    }));

    const yearStartingBalance = renumberedMonthlyData[0]?.startingBalance ?? 0;
    const yearEndingBalance = renumberedMonthlyData[renumberedMonthlyData.length - 1]?.endingBalance ?? finalBalance;
    const yearContributions = renumberedMonthlyData.reduce((sum, m) => sum + m.contribution, 0);
    const yearInterest = renumberedMonthlyData.reduce((sum, m) => sum + m.interest, 0);
    const yearInterestTax = renumberedMonthlyData.reduce((sum, m) => sum + (m.interestTax || 0), 0);
    const yearDeemedDisposalTax = renumberedMonthlyData.reduce((sum, m) => sum + (m.deemedDisposalTax || 0), 0);
    const yearWithdrawal = renumberedMonthlyData.reduce((sum, m) => sum + m.withdrawal, 0);
    const yearSalary = (renumberedMonthlyData[0]?.salary ?? 0) * 12;

    const firstMonthIndexInAllData = allMonthlyData.indexOf(yearMonthlyData[0]) || 0;
    const birthdays = firstMonthIndexInAllData >= firstYearMonths
      ? 1 + Math.floor((firstMonthIndexInAllData - firstYearMonths) / 12)
      : 0;
    const yearAge = currentAge + birthdays;

    yearlyData.push({
      year: calendarYear,
      age: yearAge,
      salary: yearSalary,
      startingBalance: yearStartingBalance,
      contributions: yearContributions,
      interestEarned: yearInterest,
      interestTaxPaid: yearInterestTax,
      deemedDisposalTaxPaid: yearDeemedDisposalTax > 0 ? yearDeemedDisposalTax : undefined,
      endingBalance: yearEndingBalance,
      monthlyData: renumberedMonthlyData,
      withdrawal: yearWithdrawal,
    });
  });

  return yearlyData;
}

/**
 * Calculate month-by-month breakdown for a single account with compound interest and monthly contributions
 * Results are then aggregated into yearly breakdowns while preserving monthly detail
 */
export function calculateAccountGrowth(options: AccountGrowthOptions): AccountResults {
  const {
    account,
    timeHorizon,
    currentAge,
    currentSalary,
    annualSalaryIncrease,
    monthsUntilNextBirthday,
    dateOfBirth,
    pensionAge,
    withdrawalRate,
    fireAge,
    salaryReplacementRate,
    pensionLumpSumAmount,
    bonusPercent,
    houseWithdrawalAge,
    enableHouseWithdrawal,
    houseDepositCalculation,
    houseDepositFromBrokerageRate,
    enablePensionLumpSum,
    taxInputs,
    pensionAgeBracketContributions,
    netBonusValue,
    pensionLumpSumAge,
    pensionLumpSumMaxAmount,
    includeStatePension,
    statePensionAge,
    statePensionWeeklyAmount,
    careerBreaks,
    windfalls,
  } = options;
  const monthlyRate = account.expectedReturn / 100 / 12;
  const firstYearMonths = monthsUntilNextBirthday || 12;
  let totalMonths = firstYearMonths + (timeHorizon - 1) * 12;
  const isPensionAccount = account.name === 'Pension';
  const isBrokerageAccount = account.name === 'Brokerage';
  const pensionAgeValue = pensionAge ?? 65;
  const pensionLumpSumAgeValue = pensionLumpSumAge ?? 50;
  const pensionLumpSumMaxAmountValue = pensionLumpSumMaxAmount ?? Infinity;
  const withdrawalRateValue = withdrawalRate ?? 4;
  const fireAgeValue = fireAge ?? 50;
  const salaryReplacementRateValue = salaryReplacementRate ?? 60;
  const statePensionAgeValue = statePensionAge ?? 66;
  const statePensionWeekly = statePensionWeeklyAmount ?? STATE_PENSION_WEEKLY;
  const statePensionWeekly = statePensionWeeklyAmount ?? STATE_PENSION_WEEKLY;
  const statePensionAnnual = statePensionWeekly * 52;
  const statePensionMonthly = statePensionAnnual / 12;

  // Store all monthly data throughout the entire time horizon
  const allMonthlyData: MonthlyBreakdown[] = [];
  let currentBalance = account.currentBalance;

  // Track cost basis for brokerage account (cumulative contributions, proportionally reduced on withdrawal)
  // Initialised to currentBalance — assumes the opening balance is entirely cost (no unrealised gain)
  let costBasis = isBrokerageAccount ? account.currentBalance : 0;

  // ETF / Stock sub-balance tracking for brokerage deemed disposal & blended tax
  const etfAllocationPct = isBrokerageAccount ? (account.etfAllocationPercent ?? 0) / 100 : 0;
  let etfBalance = isBrokerageAccount ? account.currentBalance * etfAllocationPct : 0;
  let stockBalance = isBrokerageAccount ? account.currentBalance * (1 - etfAllocationPct) : 0;
  let etfCostBasis = etfBalance;   // assumes no unrealised gain at start
  let stockCostBasis = stockBalance;
  let deemedDisposalMonthCounter = 0; // months since simulation start (8-year clock)
  const deemedDisposalPeriodMonths = DEEMED_DISPOSAL_PERIOD_YEARS * 12;
  let cumulativeDeemedDisposalTax = 0;
  let cumulativeExitTaxOnWithdrawals = 0;

  // CGT annual exemption tracking — resets each January
  let cgtExemptionUsedThisYear = 0;

  // Initialize date tracking
  let monthDate = new Date();
  if (dateOfBirth) {
    const now = new Date();
    monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  // Extend to end of calendar year so final year includes full 12 months
  const startCalendarMonth = monthDate.getMonth();
  const endCalendarMonth = (startCalendarMonth + totalMonths - 1) % 12;
  const monthsToYearEnd = endCalendarMonth === 11 ? 0 : (11 - endCalendarMonth);
  totalMonths += monthsToYearEnd;

  // Calculate the month when user reaches FIRE age
  const monthReachFire = firstYearMonths + (fireAgeValue - currentAge - 1) * 12;
  // FIRE withdrawals start in the next January after reaching the age
  // Find which calendar month they turn the age
  let tempDate = new Date(monthDate);
  for (let i = 0; i < monthReachFire; i++) {
    tempDate.setMonth(tempDate.getMonth() + 1);
  }
  const retirementCalendarMonth = tempDate.getMonth(); // 0=Jan, 11=Dec
  // Calculate months until next January (0) from the retirement month
  const monthsToNextJanuary = retirementCalendarMonth === 0 ? 12 : (12 - retirementCalendarMonth);
  const fireYearStartMonth = monthReachFire + monthsToNextJanuary;

  // Track January-based salary growth
  let januarysSeen = monthDate.getMonth() === 0 ? 1 : 0;
  
  // Track age at start of each calendar year for deferred contribution bracket increases
  // Bracket increases take effect in January of the following year
  let ageAtStartOfCurrentYear = currentAge;
  let lastYearBracketUpdated = -1;
  
  // Track when pension age is first reached to defer pension phase to next calendar year
  let yearPensionAgeReached: number | null = null;

  // Track annual withdrawal amounts (calculated in January, spread across 12 months)
  let annualPensionWithdrawal = 0;
  let annualBridgingWithdrawal = 0;
  let lastYearCalculated = -1;

  // ── Hoisted stable values (invariant across all iterations) ───
  const taxBandIndexationRate = taxInputs?.taxBandIndexation ?? 0;
  let taxBandMultiplier = taxBandIndexationRate > 0
    ? Math.pow(1 + taxBandIndexationRate / 100, januarysSeen)
    : 1;

  // ── Hoisted stable values (invariant across all iterations) ───
  const taxBandIndexationRate = taxInputs?.taxBandIndexation ?? 0;
  let taxBandMultiplier = taxBandIndexationRate > 0
    ? Math.pow(1 + taxBandIndexationRate / 100, januarysSeen)
    : 1;

  // Main monthly loop - iterate through all months in the time horizon
  for (let month = 0; month < totalMonths; month++) {
    
    // ── Phase 1: January-only annual resets ──────────────────────
    // ── Phase 1: January-only annual resets ──────────────────────
    // Increment January counter if we've entered a new January since last month
    if (month > 0 && monthDate.getMonth() === 0) {
      januarysSeen++;
      // Reset CGT annual exemption for the new calendar year
      cgtExemptionUsedThisYear = 0;
      // Recompute tax band multiplier (only changes when januarysSeen increments)
      taxBandMultiplier = taxBandIndexationRate > 0
        ? Math.pow(1 + taxBandIndexationRate / 100, januarysSeen)
        : 1;
      // Recompute tax band multiplier (only changes when januarysSeen increments)
      taxBandMultiplier = taxBandIndexationRate > 0
        ? Math.pow(1 + taxBandIndexationRate / 100, januarysSeen)
        : 1;
    }
    
    // Calculate current age based on number of full birthdays passed
    // Birthdays occur every 12 months starting after the pro-rated first year
    const birthdays = month >= firstYearMonths ? 1 + Math.floor((month - firstYearMonths) / 12) : 0;
    const ageAtMonth = currentAge + birthdays;
    
    // Resolve salary with career-break scaling
    const { salaryAtMonth, isOnFullCareerBreak } = resolveSalaryForMonth(
      currentSalary, annualSalaryIncrease, januarysSeen, ageAtMonth, careerBreaks,
    );
    // Resolve salary with career-break scaling
    const { salaryAtMonth, isOnFullCareerBreak } = resolveSalaryForMonth(
      currentSalary, annualSalaryIncrease, januarysSeen, ageAtMonth, careerBreaks,
    );

    const isJanuary = monthDate.getMonth() === 0;
    const currentYear = monthDate.getFullYear();
    
    // Update age bracket for new calendar year (defer bracket changes to January)
    if (isJanuary && currentYear !== lastYearBracketUpdated) {
      ageAtStartOfCurrentYear = ageAtMonth;
      lastYearBracketUpdated = currentYear;
    }
    
    // Resolve net salary, tax, and pension deductions for this month
    const { monthlyNetSalary, baseMonthlyNetSalary, monthlyTax, monthlyGrossIncome } =
      resolveMonthlyTaxAndIncome(
        salaryAtMonth, taxInputs, pensionAgeBracketContributions,
        ageAtStartOfCurrentYear, taxBandMultiplier, monthDate, bonusPercent,
      );
    // Resolve net salary, tax, and pension deductions for this month
    const { monthlyNetSalary, baseMonthlyNetSalary, monthlyTax, monthlyGrossIncome } =
      resolveMonthlyTaxAndIncome(
        salaryAtMonth, taxInputs, pensionAgeBracketContributions,
        ageAtStartOfCurrentYear, taxBandMultiplier, monthDate, bonusPercent,
      );
    
    let monthWithdrawal = 0;
    let lumpSumContribution = 0;
    const monthStartBalance = currentBalance;
    
    // Detect first time pension age is reached and track the year
    const previousMonth = month > 0 ? currentAge + (month >= firstYearMonths ? Math.floor((month - 1 - firstYearMonths) / 12) : 0) : currentAge;
    if (ageAtMonth >= pensionAgeValue && previousMonth < pensionAgeValue && yearPensionAgeReached === null) {
      yearPensionAgeReached = monthDate.getFullYear();
    }
    
    // Defer pension phase to next calendar year if pension age is reached mid-year
    // Only enter pension phase if it's the following calendar year, or if pension age was reached on January 1st
    const shouldDeferPensionPhase = yearPensionAgeReached !== null && currentYear === yearPensionAgeReached && monthDate.getMonth() !== 0;
    
    // Extend bridging phase to include deferral period
    let isInBridgingPhase = isBridgingPhase(ageAtMonth, fireAgeValue, pensionAgeValue) || shouldDeferPensionPhase;
    let isInDrawdownPhase = isDrawdownPhase(ageAtMonth, pensionAgeValue) && !shouldDeferPensionPhase;
    
    // ── Phase 2: January-only annual resets and one-time events ────
    // ── Phase 2: January-only annual resets and one-time events ────
    // Calculate annual withdrawal amounts in January (only when year changes)
    if (isJanuary && lastYearCalculated !== currentYear) {
      lastYearCalculated = currentYear;
      annualPensionWithdrawal = 0;
      annualBridgingWithdrawal = 0;

      // [DRAWDOWN PHASE] Calculate annual pension regular withdrawal
      if (isPensionAccount && isInDrawdownPhase) {
        // Apply forced withdrawal rates at specific ages as minimums, otherwise use user's chosen rate
        let effectiveWithdrawalRate = withdrawalRateValue;
        if (ageAtMonth >= 71) {
          // Age 71+: forced 5% minimum withdrawal rate
          effectiveWithdrawalRate = Math.max(withdrawalRateValue, 5);
          annualPensionWithdrawal = monthStartBalance * (effectiveWithdrawalRate / 100);
        } else if (ageAtMonth >= 61) {
          // Age 61-70: forced 4% minimum withdrawal rate
          effectiveWithdrawalRate = Math.max(withdrawalRateValue, 4);
          annualPensionWithdrawal = monthStartBalance * (effectiveWithdrawalRate / 100);
        } else {
          // Before age 61: use user's chosen withdrawal rate
          annualPensionWithdrawal = monthStartBalance * (withdrawalRateValue / 100);
        }
      }

      // [BRIDGING PHASE] Calculate annual brokerage withdrawal
      if (isBrokerageAccount && month >= fireYearStartMonth && isInBridgingPhase) {
        const hypotheticalSalary = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, januarysSeen) : 0;
        const targetIncome = hypotheticalSalary * (salaryReplacementRateValue / 100);
        // Reduce withdrawal by state pension income if eligible (state pension provides supplemental income)
        const statePensionOffset = (includeStatePension && ageAtMonth >= statePensionAgeValue) ? statePensionAnnual : 0;
        annualBridgingWithdrawal = Math.max(0, targetIncome - statePensionOffset);
      }
      }

      // [PENSION PHASE] Pension lump sum: withdraw up to 25% of balance (capped at user max) at pensionLumpSumAge - ONE TIME ONLY
      if (isPensionAccount && enablePensionLumpSum !== false && ageAtMonth >= pensionLumpSumAgeValue && ageAtMonth < (pensionLumpSumAgeValue + 1)) {
        const lumpSumAmount = Math.min(monthStartBalance * PENSION_LUMP_SUM_MAX_FRACTION, pensionLumpSumMaxAmountValue);
        const lumpSumAmount = Math.min(monthStartBalance * PENSION_LUMP_SUM_MAX_FRACTION, pensionLumpSumMaxAmountValue);
        monthWithdrawal = lumpSumAmount;
        currentBalance -= monthWithdrawal;
      }
      // House deposit withdrawal from Savings/Brokerage in January following houseWithdrawalAge - ONE TIME ONLY
      else if (enableHouseWithdrawal && houseWithdrawalAge !== undefined && houseDepositCalculation && ageAtMonth >= houseWithdrawalAge && ageAtMonth < (houseWithdrawalAge + 1)) {
        const totalHouseDeposit = houseDepositCalculation.depositRequired;
        const brokerageRate = houseDepositFromBrokerageRate ?? 50;
        
        if (isBrokerageAccount) {
          // Withdraw from Brokerage
          monthWithdrawal = totalHouseDeposit * (brokerageRate / 100);
          currentBalance -= monthWithdrawal;
        } else if (account.name === 'Savings') {
          // Withdraw from Savings
          monthWithdrawal = totalHouseDeposit * ((100 - brokerageRate) / 100);
          currentBalance -= monthWithdrawal;
        }
      }
      
      // Savings/Brokerage: receive lump sum allocation at pensionLumpSumAge (add to contributions + show as withdrawal) - only in January
      if (!isPensionAccount && enablePensionLumpSum !== false && ageAtMonth >= pensionLumpSumAgeValue && ageAtMonth < (pensionLumpSumAgeValue + 1) && pensionLumpSumAmount !== undefined && pensionLumpSumAmount > 0) {
        lumpSumContribution = pensionLumpSumAmount;
        // Also track as withdrawal for display in withdrawal column (not subtracted from balance, separate from recurring withdrawals)
        monthWithdrawal = pensionLumpSumAmount;
      }

      // Windfall injections: one-off cash injections at a specific age into a specific account
      if (windfalls && windfalls.length > 0) {
        for (const wf of windfalls) {
          if (wf.age === ageAtMonth && wf.destination === account.name && wf.amount > 0) {
            lumpSumContribution += wf.amount;
          }
        }
      }
    }

    // Apply recurring withdrawals spread across all 12 months
    // [DRAWDOWN PHASE] Pension regular withdrawal: spread across 12 months
    if (isPensionAccount && isInDrawdownPhase && annualPensionWithdrawal > 0) {
      monthWithdrawal = annualPensionWithdrawal / 12;
      currentBalance -= monthWithdrawal;
    }
    // [BRIDGING PHASE] Brokerage: spread across 12 months
    else if (isBrokerageAccount && month >= fireYearStartMonth && isInBridgingPhase && annualBridgingWithdrawal > 0) {
      monthWithdrawal = annualBridgingWithdrawal / 12;
      currentBalance -= monthWithdrawal;
    }

    // Proportionally reduce the cost basis for any withdrawal this month.
    // Must be done BEFORE adding contributions so the ratio uses the pre-withdrawal cost basis.
    // Per-portion gain ratios for ETF (exit tax) and stock (CGT) sub-balances
    let etfGainRatio = 0;
    let stockGainRatio = 0;
    // Capture pre-withdrawal sub-balances for tax calculation
    const preWithdrawalEtfBalance = etfBalance;
    const preWithdrawalStockBalance = stockBalance;
    if (isBrokerageAccount && monthWithdrawal > 0 && monthStartBalance > 0) {
      // Reduce cost basis by the proportion of the balance that was withdrawn
      costBasis = Math.max(0, costBasis - monthWithdrawal * (costBasis / monthStartBalance));

      // ETF / Stock sub-balance gain ratios and proportional withdrawal
      etfGainRatio = etfBalance > 0 ? Math.max(0, Math.min(1, (etfBalance - etfCostBasis) / etfBalance)) : 0;
      stockGainRatio = stockBalance > 0 ? Math.max(0, Math.min(1, (stockBalance - stockCostBasis) / stockBalance)) : 0;

      const totalSubBalance = etfBalance + stockBalance;
      if (totalSubBalance > 0) {
        const etfWithdrawalPortion = monthWithdrawal * (etfBalance / totalSubBalance);
        const stockWithdrawalPortion = monthWithdrawal * (stockBalance / totalSubBalance);
        // Reduce sub-balance cost bases proportionally
        if (etfBalance > 0) {
          etfCostBasis = Math.max(0, etfCostBasis - etfWithdrawalPortion * (etfCostBasis / etfBalance));
          etfBalance -= etfWithdrawalPortion;
        }
        if (stockBalance > 0) {
          stockCostBasis = Math.max(0, stockCostBasis - stockWithdrawalPortion * (stockCostBasis / stockBalance));
          stockBalance -= stockWithdrawalPortion;
        }
      }
    }

    // Calculate monthly contribution using extracted helper
    let monthlyContribution = resolveMonthlyContribution(
      account, month, fireYearStartMonth, isOnFullCareerBreak,
      salaryAtMonth, currentSalary, annualSalaryIncrease,
      ageAtStartOfCurrentYear, baseMonthlyNetSalary, isPensionAccount,
      monthDate, bonusPercent, netBonusValue,
    );
    // Calculate monthly contribution using extracted helper
    let monthlyContribution = resolveMonthlyContribution(
      account, month, fireYearStartMonth, isOnFullCareerBreak,
      salaryAtMonth, currentSalary, annualSalaryIncrease,
      ageAtStartOfCurrentYear, baseMonthlyNetSalary, isPensionAccount,
      monthDate, bonusPercent, netBonusValue,
    );

    // Add lump sum allocation to contributions
    monthlyContribution += lumpSumContribution;

    // Increase brokerage cost basis by new contributions (they represent the cost of acquiring new units)
    if (isBrokerageAccount && monthlyContribution > 0) {
      costBasis += monthlyContribution;
      // Split contribution between ETF and stock sub-balances using the allocation ratio
      const etfContribution = monthlyContribution * etfAllocationPct;
      const stockContribution = monthlyContribution * (1 - etfAllocationPct);
      etfCostBasis += etfContribution;
      stockCostBasis += stockContribution;
      etfBalance += etfContribution;
      stockBalance += stockContribution;
    }

    // Apply interest
    const monthInterest = currentBalance * monthlyRate;
    let monthInterestTax = 0;
    let netMonthInterest = monthInterest;
    
    // Apply DIRT tax (33%) on interest for Savings accounts only
    if (account.name === 'Savings' && monthInterest > 0) {
      monthInterestTax = calculateDirtTax(monthInterest);
      netMonthInterest = monthInterest - monthInterestTax;
    }
    
    currentBalance += netMonthInterest + monthlyContribution;

    // Apply growth to ETF/stock sub-balances (they don't have DIRT, same rate as parent)
    if (isBrokerageAccount) {
      etfBalance += etfBalance * monthlyRate;
      stockBalance += stockBalance * monthlyRate;
    }

    // Deemed disposal: every 8 years, unrealised ETF gains are taxed at exit tax rate
    let monthDeemedDisposalTax = 0;
    if (isBrokerageAccount && etfBalance > 0) {
      const dd = applyDeemedDisposal(
        etfBalance, etfCostBasis, currentBalance,
        deemedDisposalMonthCounter, deemedDisposalPeriodMonths, cumulativeDeemedDisposalTax,
      );
      monthDeemedDisposalTax = dd.tax;
      etfBalance = dd.etfBalance;
      etfCostBasis = dd.etfCostBasis;
      currentBalance = dd.currentBalance;
      deemedDisposalMonthCounter = dd.counter;
      cumulativeDeemedDisposalTax = dd.cumulativeTax;
      const dd = applyDeemedDisposal(
        etfBalance, etfCostBasis, currentBalance,
        deemedDisposalMonthCounter, deemedDisposalPeriodMonths, cumulativeDeemedDisposalTax,
      );
      monthDeemedDisposalTax = dd.tax;
      etfBalance = dd.etfBalance;
      etfCostBasis = dd.etfCostBasis;
      currentBalance = dd.currentBalance;
      deemedDisposalMonthCounter = dd.counter;
      cumulativeDeemedDisposalTax = dd.cumulativeTax;
    }

    // Format month/year as 'FEB 2026'
    const monthLabel = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

    // Calculate withdrawal tax using extracted helper
    const wtResult = resolveWithdrawalTax(
      monthWithdrawal, isPensionAccount, isBrokerageAccount,
      ageAtMonth, pensionLumpSumAgeValue, isInDrawdownPhase, isInBridgingPhase,
      enableHouseWithdrawal, houseWithdrawalAge, lumpSumContribution,
      preWithdrawalEtfBalance, preWithdrawalStockBalance,
      etfGainRatio, stockGainRatio, cgtExemptionUsedThisYear,
      cumulativeExitTaxOnWithdrawals, taxBandMultiplier,
    );
    const { withdrawalTax, withdrawalNetAmount, withdrawalPhase } = wtResult;
    cumulativeExitTaxOnWithdrawals = wtResult.cumulativeExitTaxOnWithdrawals;
    cgtExemptionUsedThisYear = wtResult.cgtExemptionUsedThisYear;
    // Calculate withdrawal tax using extracted helper
    const wtResult = resolveWithdrawalTax(
      monthWithdrawal, isPensionAccount, isBrokerageAccount,
      ageAtMonth, pensionLumpSumAgeValue, isInDrawdownPhase, isInBridgingPhase,
      enableHouseWithdrawal, houseWithdrawalAge, lumpSumContribution,
      preWithdrawalEtfBalance, preWithdrawalStockBalance,
      etfGainRatio, stockGainRatio, cgtExemptionUsedThisYear,
      cumulativeExitTaxOnWithdrawals, taxBandMultiplier,
    );
    const { withdrawalTax, withdrawalNetAmount, withdrawalPhase } = wtResult;
    cumulativeExitTaxOnWithdrawals = wtResult.cumulativeExitTaxOnWithdrawals;
    cgtExemptionUsedThisYear = wtResult.cgtExemptionUsedThisYear;

    // Compute monthly state pension income for this month
    const monthStatePensionIncome = (includeStatePension && ageAtMonth >= statePensionAgeValue) ? statePensionMonthly : 0;

    allMonthlyData.push({
      month: month + 1,
      monthYear: monthLabel,
      salary: monthlyGrossIncome,
      startingBalance: monthStartBalance,
      contribution: monthlyContribution,
      interest: monthInterest,
      interestTax: monthInterestTax,
      withdrawal: monthWithdrawal,
      endingBalance: currentBalance,
      monthlyNetSalary,
      monthlyTax,
      withdrawalPhase,
      withdrawalTax,
      withdrawalNetAmount,
      costBasis: isBrokerageAccount ? costBasis : undefined,
      deemedDisposalTax: monthDeemedDisposalTax > 0 ? monthDeemedDisposalTax : undefined,
      statePensionIncome: monthStatePensionIncome > 0 ? monthStatePensionIncome : undefined,
    });

    // Advance to next month
    monthDate.setMonth(monthDate.getMonth() + 1);
  }

  // Aggregate monthly data into yearly breakdowns using extracted helper
  const yearlyData = aggregateMonthlyToYearly(allMonthlyData, currentAge, firstYearMonths, currentBalance);
  // Aggregate monthly data into yearly breakdowns using extracted helper
  const yearlyData = aggregateMonthlyToYearly(allMonthlyData, currentAge, firstYearMonths, currentBalance);

  // Calculate totals
  const totalContributions = yearlyData.reduce((sum, yd) => sum + yd.contributions, 0);
  const totalWithdrawals = allMonthlyData.reduce((sum, m) => sum + m.withdrawal, 0);
  // Deemed disposal tax reduces the balance like a withdrawal but isn't tracked as one
  const totalInterest = currentBalance - account.currentBalance - totalContributions + totalWithdrawals + cumulativeDeemedDisposalTax;

  return {
    accountName: account.name,
    yearlyData,
    totalContributions,
    totalInterest,
    finalBalance: currentBalance,
    totalCostBasis: isBrokerageAccount ? costBasis : undefined,
    totalDeemedDisposalTax: isBrokerageAccount && cumulativeDeemedDisposalTax > 0 ? cumulativeDeemedDisposalTax : undefined,
    totalExitTax: isBrokerageAccount && cumulativeExitTaxOnWithdrawals > 0 ? cumulativeExitTaxOnWithdrawals : undefined,
  };
}

/**
 * Lightweight estimation of pension balance at a given target age.
 * Only tracks balance (no breakdown arrays) to determine the lump sum amount.
 */
function estimatePensionBalanceAtAge(
  account: AccountInput,
  targetLumpSumAge: number,
  currentAge: number,
  currentSalary: number | undefined,
  annualSalaryIncrease: number | undefined,
  monthsUntilNextBirthday: number | undefined,
  dateOfBirth: Date | undefined,
  bonusPercent: number | undefined,
  _taxInputs?: TaxInputs,
  _pensionAgeBracketContributions?: AgeBracketContributions,
  fireAge?: number,
): number {
  const monthlyRate = account.expectedReturn / 100 / 12;
  const firstYearMonths = monthsUntilNextBirthday || 12;
  const fireAgeValue = fireAge ?? 50;

  let balance = account.currentBalance;
  let monthDate = new Date();
  if (dateOfBirth) {
    const now = new Date();
    monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  let januarysSeen = monthDate.getMonth() === 0 ? 1 : 0;
  let ageAtStartOfCurrentYear = currentAge;
  let lastYearBracketUpdated = -1;

  // Calculate months until we reach pension lump sum age
  // We just need to iterate until we hit the lump sum age in January
  const maxMonths = firstYearMonths + (targetLumpSumAge - currentAge + 2) * 12;

  // Calculate the month when user reaches FIRE age for contribution cutoff
  const monthReachFire = firstYearMonths + (fireAgeValue - currentAge - 1) * 12;
  let tempDate = new Date(monthDate);
  for (let i = 0; i < monthReachFire; i++) {
    tempDate.setMonth(tempDate.getMonth() + 1);
  }
  const retirementCalendarMonth = tempDate.getMonth();
  const monthsToNextJanuary = retirementCalendarMonth === 0 ? 12 : (12 - retirementCalendarMonth);
  const fireYearStartMonth = monthReachFire + monthsToNextJanuary;

  for (let month = 0; month < maxMonths; month++) {
    if (month > 0 && monthDate.getMonth() === 0) {
      januarysSeen++;
    }

    const birthdays = month >= firstYearMonths ? 1 + Math.floor((month - firstYearMonths) / 12) : 0;
    const ageAtMonth = currentAge + birthdays;
    const isJanuary = monthDate.getMonth() === 0;
    const currentYear = monthDate.getFullYear();

    if (isJanuary && currentYear !== lastYearBracketUpdated) {
      ageAtStartOfCurrentYear = ageAtMonth;
      lastYearBracketUpdated = currentYear;
    }

    // If we've reached the lump sum age in January, return the balance
    if (ageAtMonth >= targetLumpSumAge && isJanuary && month > 0) {
      return balance;
    }

    // Calculate salary at this point
    let salaryAtMonth = currentSalary || 0;
    if (currentSalary && annualSalaryIncrease !== undefined) {
      salaryAtMonth = currentSalary * Math.pow(1 + annualSalaryIncrease / 100, januarysSeen);
    }

    // Calculate contributions (only during working phase)
    let monthlyContribution = 0;
    if (month < fireYearStartMonth) {
      if (account.isSalaryPercentage && currentSalary && annualSalaryIncrease !== undefined) {
        let contributionPercentage = account.monthlyContribution;
        if (account.ageBracketContributions) {
          contributionPercentage = getAgeBracketPercentage(ageAtStartOfCurrentYear, account.ageBracketContributions);
        }
        monthlyContribution = (salaryAtMonth / 12) * (contributionPercentage / 100);

        // Add employer contribution
        if (account.employerAgeBracketContributions) {
          const employerPercent = getEmployerAgeBracketPercentage(ageAtStartOfCurrentYear, account.employerAgeBracketContributions);
          if (employerPercent > 0) {
            monthlyContribution += (salaryAtMonth / 12) * (employerPercent / 100);
          }
        }
      } else {
        monthlyContribution = account.monthlyContribution;
      }

      // Add bonus contribution (December only)
      const isDecember = monthDate.getMonth() === 11;
      if (isDecember && bonusPercent !== undefined && bonusPercent > 0 && account.bonusContributionPercent !== undefined) {
        const annualBonus = salaryAtMonth * (bonusPercent / 100);
        let bonusContributionPercent: number | undefined =
          typeof account.bonusContributionPercent === 'number' ? account.bonusContributionPercent : undefined;
        if (account.bonusContributionPercent === 'age-bracket' && account.ageBracketContributions) {
          bonusContributionPercent = getAgeBracketPercentage(ageAtStartOfCurrentYear, account.ageBracketContributions);
        }
        if (bonusContributionPercent !== undefined && bonusContributionPercent > 0) {
          monthlyContribution += annualBonus * (bonusContributionPercent / 100);
        }
      }
    }

    // Apply interest and contribution
    const monthInterest = balance * monthlyRate;
    balance += monthInterest + monthlyContribution;

    monthDate.setMonth(monthDate.getMonth() + 1);
  }

  return balance;
}

/**
 * Calculate growth for all accounts in the portfolio
 */
export function calculatePortfolioGrowth(options: PortfolioGrowthOptions): PortfolioResults {
  const {
    accounts,
    timeHorizon,
    currentAge,
    currentSalary,
    annualSalaryIncrease,
    monthsUntilNextBirthday,
    dateOfBirth,
    pensionAge,
    withdrawalRate,
    fireAge,
    salaryReplacementRate,
    lumpSumToBrokerageRate,
    bonusPercent,
    houseWithdrawalAge,
    enableHouseWithdrawal,
    houseDepositCalculation,
    houseDepositFromBrokerageRate,
    enablePensionLumpSum,
    taxInputs,
    pensionLumpSumAge,
    mortgageExemption,
    pensionLumpSumMaxAmount,
    includeStatePension,
    statePensionAge,
    statePensionWeeklyAmount,
    prsiContributionsToDate,
    careerBreaks,
    windfalls,
  } = options;
  const pensionAgeValue = pensionAge ?? 65;
  const pensionLumpSumAgeValue = pensionLumpSumAge ?? 50;
  const fireAgeValue = fireAge ?? 50;
  const lumpSumToBrokerageRateValue = lumpSumToBrokerageRate ?? 80;
  const pensionLumpSumMaxAmountValue = pensionLumpSumMaxAmount ?? Infinity;

  // Extract pension account's age bracket contributions for use in tax calculations
  const pensionAccount = accounts.find((a) => a.name === 'Pension');
  const pensionAgeBracketContributions = pensionAccount?.ageBracketContributions;

  // Calculate net bonus for use in savings/brokerage contribution calculations
  let netBonusValue = 0;
  if (currentSalary && bonusPercent && bonusPercent > 0 && taxInputs) {
    // Calculate pension contribution percentage from the amount in taxInputs
    const pensionPercent = currentSalary > 0 ? (taxInputs.pensionContribution / currentSalary) * 100 : 0;
    const netBonusResult = calculateNetBonus(
      currentSalary,
      bonusPercent,
      pensionPercent,
      taxInputs.bikValue || 0,
      taxInputs.claimRentRelief,
      taxInputs.claimMedicalInsurance,
    );
    netBonusValue = netBonusResult.bonusNetSalary;
  }

  // Estimate pension balance at lump sum age to determine lump sum amount (lightweight, no full breakdown)
  let lumpSumAmount = 0;
  if (pensionAccount && enablePensionLumpSum !== false) {
    const estimatedBalance = estimatePensionBalanceAtAge(
      pensionAccount,
      pensionLumpSumAgeValue,
      currentAge,
      currentSalary,
      annualSalaryIncrease,
      monthsUntilNextBirthday,
      dateOfBirth,
      bonusPercent,
      taxInputs,
      pensionAgeBracketContributions,
      fireAge,
    );
    lumpSumAmount = Math.min(estimatedBalance * PENSION_LUMP_SUM_MAX_FRACTION, pensionLumpSumMaxAmountValue);
    lumpSumAmount = Math.min(estimatedBalance * PENSION_LUMP_SUM_MAX_FRACTION, pensionLumpSumMaxAmountValue);
  }

  // Apply pension lump sum tax tiers and compute net amount for distribution
  let lumpSumTaxBreakdown: PensionLumpSumTaxBreakdown | undefined;
  let netLumpSumForDistribution = 0;
  if (lumpSumAmount > 0 && enablePensionLumpSum !== false) {
    const taxResult = calculatePensionLumpSumTax(lumpSumAmount);
    netLumpSumForDistribution = taxResult.netLumpSum;
    lumpSumTaxBreakdown = {
      grossLumpSum: lumpSumAmount,
      ...taxResult,
    };
  }

  // Compute the effective state pension amount based on PRSI contribution eligibility.
  // If the user hasn't accumulated enough contributions for the full rate, scale the amount
  // proportionally rather than always paying the full configured weekly amount.
  const rawStatePensionWeekly = statePensionWeeklyAmount ?? STATE_PENSION_WEEKLY;
  const rawStatePensionWeekly = statePensionWeeklyAmount ?? STATE_PENSION_WEEKLY;
  const effectiveStatePensionWeekly = (() => {
    if (!includeStatePension) return rawStatePensionWeekly;
    const prsiSummary = calculatePrsiSummary({
      currentAge,
      fireAge: fireAgeValue,
      priorContributions: typeof prsiContributionsToDate === 'number' ? prsiContributionsToDate : 0,
      careerBreaks: careerBreaks ?? [],
      pensionAge: pensionAgeValue,
      statePensionAge: statePensionAge ?? 66,
      statePensionWeeklyAmount: rawStatePensionWeekly,
    });
    return prsiSummary.estimatedWeeklyStatePension;
  })();

  // Calculate all accounts with lump sum information
  const accountResults = accounts.map((account) => {
    let lumpSumAllocation = 0;
    
    // Determine lump sum allocation for this account (use net after-tax amount)
    if (netLumpSumForDistribution > 0 && account.name !== 'Pension') {
      if (account.name === 'Brokerage') {
        lumpSumAllocation = netLumpSumForDistribution * (lumpSumToBrokerageRateValue / 100);
      } else if (account.name === 'Savings') {
        lumpSumAllocation = netLumpSumForDistribution * ((100 - lumpSumToBrokerageRateValue) / 100);
      }
    }
    
    return calculateAccountGrowth({
      account,
      timeHorizon,
      currentAge,
      currentSalary,
      annualSalaryIncrease,
      monthsUntilNextBirthday,
      dateOfBirth,
      pensionAge,
      withdrawalRate,
      fireAge,
      salaryReplacementRate,
      pensionLumpSumAmount: lumpSumAllocation,
      bonusPercent,
      houseWithdrawalAge,
      enableHouseWithdrawal,
      houseDepositCalculation,
      houseDepositFromBrokerageRate,
      enablePensionLumpSum,
      taxInputs,
      pensionAgeBracketContributions,
      netBonusValue,
      pensionLumpSumAge,
      pensionLumpSumMaxAmount: pensionLumpSumMaxAmountValue,
      includeStatePension,
      statePensionAge,
      statePensionWeeklyAmount: effectiveStatePensionWeekly,
      careerBreaks,
      windfalls,
    });
  });

  const totalFinalBalance = accountResults.reduce(
    (sum, result) => sum + result.finalBalance,
    0
  );

  const totalContributions = accountResults.reduce(
    (sum, result) => sum + result.totalContributions,
    0
  );

  const totalInterest = accountResults.reduce(
    (sum, result) => sum + result.totalInterest,
    0
  );

  // Calculate final salary as the minimum of target age salary and early retirement age salary
  // Count Januaries: salary grows each January starting from the first one (including starting month if it's January)
  const monthDate = dateOfBirth ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : new Date();
  const startingMonthIsJanuary = monthDate.getMonth() === 0;
  const januariesToTargetAge = startingMonthIsJanuary ? timeHorizon + 1 : timeHorizon;
  const januariesToEarlyRetirement = startingMonthIsJanuary ? (fireAgeValue - currentAge) + 1 : (fireAgeValue - currentAge);
  
  const salaryAtTargetAge = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, januariesToTargetAge) : 0;
  const salaryAtEarlyRetirement = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, januariesToEarlyRetirement) : 0;
  const finalSalary = Math.min(salaryAtTargetAge, salaryAtEarlyRetirement);
  
  // Calculate bonus salary at the same milestone
  const bonusSalary = bonusPercent !== undefined && bonusPercent > 0 ? finalSalary * (bonusPercent / 100) : 0;

  // Extract milestone snapshots
  const fireSnapshot = extractMilestoneSnapshot(accountResults, fireAgeValue);
  const houseWithdrawalAgeSnapshot = houseWithdrawalAge && enableHouseWithdrawal ? extractMilestoneSnapshot(accountResults, houseWithdrawalAge) : undefined;
  const pensionDrawdownSnapshot = extractMilestoneSnapshot(accountResults, pensionAgeValue);

  return {
    accountResults,
    totalFinalBalance,
    totalContributions,
    totalInterest,
    finalSalary,
    bonusSalary,
    monthsUntilNextBirthday: monthsUntilNextBirthday || 12,
    fireAge: fireAgeValue,
    pensionAge: pensionAgeValue,
    enablePensionLumpSum,
    pensionLumpSumAge,
    houseWithdrawalAge,
    enableHouseWithdrawal,
    houseDepositCalculation,
    mortgageExemption,
    fireSnapshot,
    houseWithdrawalAgeSnapshot,
    pensionDrawdownSnapshot,
    taxInputs,
    enableTaxCalculation: true,
    lumpSumTaxBreakdown,
  };
}

export interface CombinedYearData {
  year: number;
  age: number;
  Savings: number;
  Pension: number;
  Brokerage: number;
  Total: number;
  /** Cumulative contributions across all accounts */
  Principal: number;
  /** Cumulative interest across all accounts */
  Interest: number;
  /** This year's contributions (non-cumulative) */
  yearContributions: number;
  /** This year's interest earned (non-cumulative) */
  yearInterest: number;
  /** This year's withdrawals (non-cumulative) */
  yearWithdrawals: number;
  /** This year's net income (salary net of tax during working, withdrawal net of tax during retirement) */
  netIncome: number;
  /** Salary at this year */
  salary: number;
  /** Phase at this age */
  phase: 'working' | 'bridging' | 'drawdown';
  /** Annual Irish state pension income (if eligible) */
  statePensionIncome: number;
}

/**
 * Combine yearly data across all accounts for charting.
 * Uses O(n) running accumulators instead of O(n²) re-summation.
 */
export function combineYearlyData(
  accountResults: AccountResults[],
  fireAge: number,
  pensionAge: number,
  taxInputs?: import('../types').TaxInputs,
): CombinedYearData[] {
  const timeHorizon = accountResults[0]?.yearlyData.length || 0;
  const combined: CombinedYearData[] = [];

  // Running accumulators per account (O(n) instead of O(n²))
  const cumulativeContributions = new Map<string, number>();
  const cumulativeInterest = new Map<string, number>();
  accountResults.forEach((r) => {
    cumulativeContributions.set(r.accountName, 0);
    cumulativeInterest.set(r.accountName, 0);
  });

  // Pre-compute indexation rate (0 = no indexation)
  const taxBandIndexationRate = taxInputs?.taxBandIndexation ?? 0;

  for (let year = 0; year < timeHorizon; year++) {
    const age = accountResults[0]?.yearlyData[year]?.age ?? 0;

    // Multiplier for this year: indexed thresholds grow from the base (year 0 = 2026)
    const taxBandMultiplier = taxBandIndexationRate > 0
      ? Math.pow(1 + taxBandIndexationRate / 100, year)
      : 1;

    let totalEndingBalance = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;
    let yearContributions = 0;
    let yearInterest = 0;
    let yearWithdrawals = 0;
    let netIncome = 0;
    let salary = 0;

    const dataPoint: Record<string, number> = {};

    accountResults.forEach((result) => {
      const name = result.accountName;
      const yd = result.yearlyData[year];
      const endingBalance = yd?.endingBalance || 0;

      dataPoint[name] = endingBalance;
      totalEndingBalance += endingBalance;

      // Update running accumulators
      const prevC = cumulativeContributions.get(name) || 0;
      const prevI = cumulativeInterest.get(name) || 0;
      const thisC = yd?.contributions || 0;
      const thisI = yd?.interestEarned || 0;
      cumulativeContributions.set(name, prevC + thisC);
      cumulativeInterest.set(name, prevI + thisI);

      totalPrincipal += prevC + thisC;
      totalInterest += prevI + thisI;
      yearContributions += thisC;
      yearInterest += thisI;
      yearWithdrawals += yd?.withdrawal || 0;

      // Salary from any account that has it (they all share the same salary)
      if (yd?.salary) salary = yd.salary;
    });

    // Aggregate annual state pension income from first account's monthly data
    let annualStatePensionIncome = 0;
    const firstYdForPension = accountResults[0]?.yearlyData[year];
    if (firstYdForPension?.monthlyData) {
      firstYdForPension.monthlyData.forEach((m: MonthlyBreakdown) => {
        annualStatePensionIncome += m.statePensionIncome || 0;
      });
    }

    // Compute net income to match the table's computeAnnuals logic:
    // - Working: sum of monthlyNetSalary from first account
    // - Early retirement: brokerage annual withdrawal run through CGT calculator (+ state pension net of PAYE)
    // - Pension: pension annual withdrawal run through pension withdrawal tax calculator (incl. state pension)
    const phase = getPhaseType(age, fireAge, pensionAge);
    if (phase === 'bridging') {
      const brokerage = accountResults.find((r) => r.accountName === 'Brokerage');
      const brokerageYd = brokerage?.yearlyData[year];
      const annualWithdrawal = brokerageYd?.withdrawal || 0;
      if (annualWithdrawal > 0) {
        // Read pre-computed withdrawalTax (which already uses the cost-basis gain ratio)
        const annualTax = (brokerageYd?.monthlyData ?? []).reduce(
          (s: number, m: MonthlyBreakdown) => s + (m.withdrawalTax || 0), 0
        );
        netIncome = annualWithdrawal - annualTax;
      }
      // Add state pension net of PAYE/USC (state pension is taxable income)
      if (annualStatePensionIncome > 0) {
        const spTaxR = calculatePensionWithdrawalTax(annualStatePensionIncome, true, age, taxBandMultiplier);
        netIncome += spTaxR.netWithdrawal;
      }
    } else if (phase === 'drawdown') {
      const pension = accountResults.find((r) => r.accountName === 'Pension');
      const pensionYd = pension?.yearlyData[year];
      const annualWithdrawal = pensionYd?.withdrawal || 0;
      // Calculate tax on combined pension withdrawal + state pension so progressive bands apply correctly
      const totalTaxableIncome = annualWithdrawal + annualStatePensionIncome;
      if (totalTaxableIncome > 0) {
        const taxR = calculatePensionWithdrawalTax(totalTaxableIncome, true, age, taxBandMultiplier);
        netIncome = taxR.netWithdrawal;
      }
    } else {
      // Working phase: sum monthlyNetSalary from the first account
      const firstYd = accountResults[0]?.yearlyData[year];
      if (firstYd?.monthlyData) {
        firstYd.monthlyData.forEach((m: MonthlyBreakdown) => {
          netIncome += m.monthlyNetSalary || 0;
        });
      }
    }

    combined.push({
      year,
      age,
      Savings: dataPoint['Savings'] || 0,
      Pension: dataPoint['Pension'] || 0,
      Brokerage: dataPoint['Brokerage'] || 0,
      Total: totalEndingBalance,
      Principal: totalPrincipal,
      Interest: totalInterest,
      yearContributions,
      yearInterest,
      yearWithdrawals,
      netIncome,
      salary,
      phase: getPhaseType(age, fireAge, pensionAge),
      statePensionIncome: annualStatePensionIncome,
    });
  }

  return combined;
}
