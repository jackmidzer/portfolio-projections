/**
 * Monte Carlo optimised calculation engine.
 *
 * Strategy:
 * 1. Build a deterministic "schedule" once — recording per-month salary, tax,
 *    contributions, phase transitions, and fixed withdrawals for each account.
 *    Everything that does NOT depend on investment returns is captured here.
 *
 * 2. For each simulation, run a stripped-down balance loop that applies the
 *    pre-computed schedule and only varies the monthly interest rate (derived
 *    from the sampled return). Balance-dependent quantities (pension drawdown
 *    withdrawals, deemed disposal, pension lump sum) are evaluated inline.
 *
 * This avoids allocating MonthlyBreakdown arrays, TaxCalculationResult objects,
 * date-string formatting, and the aggregateMonthlyToYearly / combineYearlyData
 * passes that the full calculatePortfolioGrowth path produces — none of which
 * the MC worker uses (it only reads yearly ending balances and net income).
 */

import type { AccountInput, AccountType, PortfolioGrowthOptions } from '../types';
import { getAgeBracketPercentage, getEmployerAgeBracketPercentage, resolveSalaryForMonth } from './calculations';
import { calculateNetSalaryLite, calculateBonusTaxBurdenLite, calculatePensionWithdrawalTaxLite, calculateBrokerageWithdrawalTax, calculateExitTax, calculatePrsiSummary, calculatePensionLumpSumTax } from './taxCalculations';
import { isBridgingPhase, isDrawdownPhase } from './phaseHelpers';
import { DEEMED_DISPOSAL_PERIOD_YEARS, CGT_ANNUAL_EXEMPTION, STATE_PENSION_WEEKLY, PENSION_LUMP_SUM_MAX_FRACTION, DIRT_RATE } from '../constants/irishTaxRates2026';

// ─── Types ──────────────────────────────────────────────────────────

/** Per-month pre-computed deterministic data for one account. */
interface MCScheduleMonth {
  /** Monthly contribution (including bonus & lump sum allocations) */
  contribution: number;
  /** Monthly net salary (only meaningful for first account — used for working-phase net income) */
  netSalary: number;
  /** Base monthly net salary (before bonus) used for salary-% contribution base */
  baseNetSalary: number;
  /** Whether this month is January */
  isJanuary: boolean;
  /** Calendar year index (0-based from start year) for yearly aggregation */
  yearIndex: number;
  /** Age at this month */
  age: number;
  /** Phase type */
  phase: 'working' | 'bridging' | 'drawdown';
  /** Fixed withdrawal amount (bridging, house deposit, pension lump sum incoming).
   *  For balance-dependent items (pension drawdown, pension lump sum outgoing)
   *  this is 0 and the withdrawal is computed in the sim loop instead. */
  fixedWithdrawal: number;
  /** Flags for balance-dependent actions the sim loop must handle */
  pensionDrawdown: boolean;
  pensionLumpSumWithdraw: boolean;
  /** Lump sum contribution (pension lump sum allocation incoming or windfall) */
  lumpSumContribution: number;
  /** Annual bridging withdrawal (set in January, spread /12) */
  annualBridgingWithdrawal: number;
  /** Annual pension drawdown % (determined by age — rate, not amount) */
  pensionDrawdownRate: number;
  /** Monthly state pension income */
  statePensionMonthly: number;
  /** Tax band multiplier for this month (for withdrawal tax calculations) */
  taxBandMultiplier: number;
}

/** Result from a single MC simulation run. */
export interface MCSimResult {
  yearlyTotalBalances: number[];
  yearlyNetIncomes: number[];
}

/** The full MC computation result (percentiles ready for the worker response). */
export interface MCResult {
  percentiles: { p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[]; ages: number[] };
  incomePercentiles: { p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[]; ages: number[] };
}

// ─── Schedule builder ───────────────────────────────────────────────

interface AccountSchedule {
  name: AccountType;
  months: MCScheduleMonth[];
  isPension: boolean;
  isBrokerage: boolean;
  isSavings: boolean;
  initialBalance: number;
  etfAllocationPct: number;
  pensionLumpSumMaxAmountValue: number;
}

interface FullSchedule {
  accounts: AccountSchedule[];
  numYears: number;
  ages: number[];
  /** Per-year phase type (index = yearIndex) */
  yearPhases: ('working' | 'bridging' | 'drawdown')[];
  /** Per-year tax band multiplier (index = yearIndex) */
  yearTaxBandMultiplier: number[];
  /** Per-year annual state pension income (from first account schedule) */
  yearStatePensionIncome: number[];
}

/**
 * Build the pre-computed deterministic schedule for all accounts.
 * This mirrors the logic of calculateAccountGrowth / calculatePortfolioGrowth
 * but only records the deterministic quantities (salary, tax, contribution,
 * phase, withdrawal type) — it does NOT track balances.
 */
function buildDeterministicSchedule(options: PortfolioGrowthOptions): FullSchedule {
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
  const withdrawalRateValue = withdrawalRate ?? 4;
  const salaryReplacementRateValue = salaryReplacementRate ?? 60;
  const lumpSumToBrokerageRateValue = lumpSumToBrokerageRate ?? 80;
  const pensionLumpSumMaxAmountValue = pensionLumpSumMaxAmount ?? Infinity;
  const statePensionAgeValue = statePensionAge ?? 66;
  const rawStatePensionWeekly = statePensionWeeklyAmount ?? STATE_PENSION_WEEKLY;
  const firstYearMonths = monthsUntilNextBirthday || 12;

  // Compute effective state pension weekly amount (PRSI-adjusted)
  const effectiveStatePensionWeekly = (() => {
    if (!includeStatePension) return rawStatePensionWeekly;
    const prsiSummary = calculatePrsiSummary({
      currentAge,
      fireAge: fireAgeValue,
      priorContributions: typeof prsiContributionsToDate === 'number' ? prsiContributionsToDate : 0,
      careerBreaks: careerBreaks ?? [],
      pensionAge: pensionAgeValue,
      statePensionAge: statePensionAgeValue,
      statePensionWeeklyAmount: rawStatePensionWeekly,
    });
    return prsiSummary.estimatedWeeklyStatePension;
  })();
  const statePensionAnnual = effectiveStatePensionWeekly * 52;
  const statePensionMonthly = statePensionAnnual / 12;

  // ── Compute totalMonths (same algorithm as calculateAccountGrowth) ─
  let totalMonths = firstYearMonths + (timeHorizon - 1) * 12;
  let monthDate = new Date();
  if (dateOfBirth) {
    const now = new Date();
    monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const startCalendarMonth = monthDate.getMonth();
  const endCalendarMonth = (startCalendarMonth + totalMonths - 1) % 12;
  const monthsToYearEnd = endCalendarMonth === 11 ? 0 : (11 - endCalendarMonth);
  totalMonths += monthsToYearEnd;

  // ── FIRE year start month ─────────────────────────────────────
  const monthReachFire = firstYearMonths + (fireAgeValue - currentAge - 1) * 12;
  let tempDate = new Date(monthDate);
  for (let i = 0; i < monthReachFire; i++) {
    tempDate.setMonth(tempDate.getMonth() + 1);
  }
  const retirementCalendarMonth = tempDate.getMonth();
  const monthsToNextJanuary = retirementCalendarMonth === 0 ? 12 : (12 - retirementCalendarMonth);
  const fireYearStartMonth = monthReachFire + monthsToNextJanuary;

  // ── Pension account bracket contributions (for tax) ───────────
  const pensionAccount = accounts.find((a) => a.name === 'Pension');
  const pensionAgeBracketContributions = pensionAccount?.ageBracketContributions;

  // ── Net bonus (deterministic, base salary year 0) ─────────────
  // Net bonus grows with salary; actual computation is done per-month below via computeNetBonusForSalary().

  // ── Estimate pension lump sum amount (deterministic, uses base return) ─
  let lumpSumAmount = 0;
  let netLumpSumForDistribution = 0;
  if (pensionAccount && enablePensionLumpSum !== false) {
    // Re-use the lightweight estimator from the main code path.
    // We inline a simplified version here to avoid importing the private function.
    const estimatedBalance = estimatePensionBalanceLite(
      pensionAccount, pensionLumpSumAgeValue, currentAge,
      currentSalary, annualSalaryIncrease, firstYearMonths,
      new Date(monthDate), bonusPercent, fireAgeValue,
    );
    lumpSumAmount = Math.min(estimatedBalance * PENSION_LUMP_SUM_MAX_FRACTION, pensionLumpSumMaxAmountValue);
  }
  if (lumpSumAmount > 0 && enablePensionLumpSum !== false) {
    const taxResult = calculatePensionLumpSumTax(lumpSumAmount);
    netLumpSumForDistribution = taxResult.netLumpSum;
  }

  // ── Tax band indexation ───────────────────────────────────────
  const taxBandIndexationRate = taxInputs?.taxBandIndexation ?? 0;

  // ── Build per-account schedules ───────────────────────────────

  const accountSchedules: AccountSchedule[] = [];

  // We need to iterate through months once per account (like calculateAccountGrowth).
  // Since the salary/tax/age logic is shared across accounts, we compute it once
  // for the first account and reuse the derived age/month metadata for the rest.
  // However, contributions and withdrawals differ per account, so we loop per account.

  // Pre-compute shared month metadata (age, januarysSeen, etc.)
  interface MonthMeta {
    isJanuary: boolean;
    calendarYear: number;
    ageAtMonth: number;
    ageAtStartOfCurrentYear: number;
    januarysSeen: number;
    salaryAtMonth: number;
    isOnFullCareerBreak: boolean;
    taxBandMultiplier: number;
    yearIndex: number;
    monthIndex: number; // month in the calendar year (0-11)
    phase: 'working' | 'bridging' | 'drawdown';
    isInBridgingPhase: boolean;
    isInDrawdownPhase: boolean;
    statePensionMonthly: number;
    // Tax calculation results (computed once, shared by all accounts)
    netSalary: number;
    baseNetSalary: number;
    monthlyTax: number;
    monthlyGrossIncome: number;
    monthlyPensionDeduction: number;
  }

  const monthMetas: MonthMeta[] = new Array(totalMonths);
  {
    let md = new Date(monthDate);
    let januarysSeen = md.getMonth() === 0 ? 1 : 0;
    let ageAtStartOfCurrentYear = currentAge;
    let lastYearBracketUpdated = -1;
    let yearPensionAgeReached: number | null = null;
    const startYear = md.getFullYear();
    let yearIndexCounter = 0;
    let prevCalYear = startYear;

    for (let month = 0; month < totalMonths; month++) {
      const isJanuary = md.getMonth() === 0;
      const calendarYear = md.getFullYear();

      if (month > 0 && isJanuary) {
        januarysSeen++;
      }

      const birthdays = month >= firstYearMonths ? 1 + Math.floor((month - firstYearMonths) / 12) : 0;
      const ageAtMonth = currentAge + birthdays;

      if (isJanuary && calendarYear !== lastYearBracketUpdated) {
        ageAtStartOfCurrentYear = ageAtMonth;
        lastYearBracketUpdated = calendarYear;
      }

      // Track year index
      if (calendarYear !== prevCalYear) {
        yearIndexCounter++;
        prevCalYear = calendarYear;
      }

      // Pension phase deferral
      const previousAge = month > 0 ? currentAge + (month >= firstYearMonths ? Math.floor((month - 1 - firstYearMonths) / 12) : 0) : currentAge;
      if (ageAtMonth >= pensionAgeValue && previousAge < pensionAgeValue && yearPensionAgeReached === null) {
        yearPensionAgeReached = calendarYear;
      }
      const shouldDeferPensionPhase = yearPensionAgeReached !== null && calendarYear === yearPensionAgeReached && md.getMonth() !== 0;
      const isInBridging = isBridgingPhase(ageAtMonth, fireAgeValue, pensionAgeValue) || shouldDeferPensionPhase;
      const isInDrawdown = isDrawdownPhase(ageAtMonth, pensionAgeValue) && !shouldDeferPensionPhase;

      const taxBandMultiplier = taxBandIndexationRate > 0
        ? Math.pow(1 + taxBandIndexationRate / 100, januarysSeen)
        : 1;

      // Salary
      const { salaryAtMonth, isOnFullCareerBreak } = resolveSalaryForMonth(
        currentSalary, annualSalaryIncrease, januarysSeen, ageAtMonth, careerBreaks,
      );

      // Tax & income (computed once, shared across accounts)
      let netSalary = 0, baseNetSalary = 0, monthlyTax = 0, monthlyGrossIncome = 0, monthlyPensionDeduction = 0;
      if (salaryAtMonth > 0 && taxInputs) {
        let dynamicPensionContribution = taxInputs.pensionContribution;
        if (pensionAgeBracketContributions && salaryAtMonth > 0) {
          const pensionPercent = getAgeBracketPercentage(ageAtStartOfCurrentYear, pensionAgeBracketContributions);
          dynamicPensionContribution = (salaryAtMonth * pensionPercent) / 100;
        }

        const annualTaxResult = calculateNetSalaryLite({
          grossSalary: salaryAtMonth,
          pensionContribution: dynamicPensionContribution,
          bikValue: taxInputs.bikValue || 0,
          claimRentRelief: taxInputs.claimRentRelief,
          claimMedicalInsurance: taxInputs.claimMedicalInsurance,
          taxBandMultiplier,
        });

        const baseMonthlyTax = annualTaxResult.totalTax / 12;
        const baseMonthlySalaryPension = dynamicPensionContribution / 12;

        const isDecemberMonth = md.getMonth() === 11;
        const hasBonusPercent = bonusPercent !== undefined && bonusPercent > 0;

        monthlyGrossIncome = salaryAtMonth / 12;
        monthlyPensionDeduction = baseMonthlySalaryPension;
        monthlyTax = baseMonthlyTax;
        baseNetSalary = (salaryAtMonth / 12) - baseMonthlyTax - baseMonthlySalaryPension;

        if (isDecemberMonth && hasBonusPercent) {
          const pensionPercent = pensionAgeBracketContributions
            ? getAgeBracketPercentage(ageAtStartOfCurrentYear, pensionAgeBracketContributions)
            : (dynamicPensionContribution / salaryAtMonth) * 100;

          const bonusTaxBurden = calculateBonusTaxBurdenLite(
            salaryAtMonth, bonusPercent!, pensionPercent,
            taxInputs.bikValue || 0, taxInputs.claimRentRelief,
            taxInputs.claimMedicalInsurance, taxBandMultiplier,
          );

          monthlyTax = baseMonthlyTax + bonusTaxBurden;
          const bonusAmount = salaryAtMonth * (bonusPercent! / 100);
          monthlyGrossIncome = salaryAtMonth / 12 + bonusAmount;
          const bonusPensionDeduction = (bonusAmount * pensionPercent) / 100;
          monthlyPensionDeduction = baseMonthlySalaryPension + bonusPensionDeduction;
        }

        netSalary = monthlyGrossIncome - monthlyTax - monthlyPensionDeduction;
      } else if (salaryAtMonth > 0) {
        monthlyGrossIncome = salaryAtMonth / 12;
        netSalary = salaryAtMonth / 12;
        baseNetSalary = salaryAtMonth / 12;
      }

      const phase = isInDrawdown ? 'drawdown' : isInBridging ? 'bridging' : 'working';
      const spMonthly = (includeStatePension && ageAtMonth >= statePensionAgeValue) ? statePensionMonthly : 0;

      monthMetas[month] = {
        isJanuary,
        calendarYear,
        ageAtMonth,
        ageAtStartOfCurrentYear,
        januarysSeen,
        salaryAtMonth,
        isOnFullCareerBreak,
        taxBandMultiplier,
        yearIndex: yearIndexCounter,
        monthIndex: md.getMonth(),
        phase,
        isInBridgingPhase: isInBridging,
        isInDrawdownPhase: isInDrawdown,
        statePensionMonthly: spMonthly,
        netSalary,
        baseNetSalary,
        monthlyTax,
        monthlyGrossIncome,
        monthlyPensionDeduction,
      };

      md.setMonth(md.getMonth() + 1);
    }
  }

  // Compute net bonus per salary level for use in savings/brokerage contribution calc
  // (The net bonus grows with salary; we need it for the schedule.)
  function computeNetBonusForSalary(salary: number): number {
    if (!currentSalary || !bonusPercent || bonusPercent <= 0 || !taxInputs) return 0;
    const origPensionPercent = currentSalary > 0 ? (taxInputs.pensionContribution / currentSalary) * 100 : 0;
    const bonusAmount = salary * (bonusPercent / 100);
    const bonusPensionContribution = (bonusAmount * origPensionPercent) / 100;
    const bonusTaxBurden = calculateBonusTaxBurdenLite(
      salary, bonusPercent, origPensionPercent,
      taxInputs.bikValue || 0, taxInputs.claimRentRelief,
      taxInputs.claimMedicalInsurance, 1, // net bonus for contribution is always base-year tax bands
    );
    return bonusAmount - bonusPensionContribution - bonusTaxBurden;
  }

  const numYears = monthMetas[totalMonths - 1].yearIndex + 1;

  // Build per-account schedule
  for (const account of accounts) {
    const isPension = account.name === 'Pension';
    const isBrokerage = account.name === 'Brokerage';
    const isSavings = account.name === 'Savings';
    const etfAllocationPct = isBrokerage ? (account.etfAllocationPercent ?? 0) / 100 : 0;

    // Lump sum allocation for this account
    let lumpSumAllocation = 0;
    if (netLumpSumForDistribution > 0 && !isPension) {
      if (isBrokerage) {
        lumpSumAllocation = netLumpSumForDistribution * (lumpSumToBrokerageRateValue / 100);
      } else if (isSavings) {
        lumpSumAllocation = netLumpSumForDistribution * ((100 - lumpSumToBrokerageRateValue) / 100);
      }
    }

    const months: MCScheduleMonth[] = new Array(totalMonths);
    let lastYearCalculated = -1;
    let annualBridgingWithdrawal = 0;

    for (let month = 0; month < totalMonths; month++) {
      const m = monthMetas[month];

      let contribution = 0;
      let fixedWithdrawal = 0;
      let lumpSumContrib = 0;
      let pensionDrawdown = false;
      let pensionLumpSumWithdraw = false;
      let pensionDrawdownRate = 0;

      // ── Contributions (working phase only) ────────────────────
      if (month < fireYearStartMonth && !m.isOnFullCareerBreak) {
        if (account.isSalaryPercentage && currentSalary && annualSalaryIncrease !== undefined) {
          let contributionPercentage = account.monthlyContribution;
          if (account.ageBracketContributions) {
            contributionPercentage = getAgeBracketPercentage(m.ageAtStartOfCurrentYear, account.ageBracketContributions);
          }
          const contributionBase = isPension ? (m.salaryAtMonth / 12) : m.baseNetSalary;
          contribution = contributionBase * (contributionPercentage / 100);

          if (account.employerAgeBracketContributions) {
            const employerPercent = getEmployerAgeBracketPercentage(m.ageAtStartOfCurrentYear, account.employerAgeBracketContributions);
            if (employerPercent > 0) {
              contribution += (m.salaryAtMonth / 12) * (employerPercent / 100);
            }
          }
        } else {
          contribution = account.monthlyContribution;
        }

        // Bonus contribution (December only)
        const isDecember = m.monthIndex === 11;
        if (isDecember && bonusPercent !== undefined && bonusPercent > 0 && account.bonusContributionPercent !== undefined) {
          const isSavingsOrBrokerage = isSavings || isBrokerage;
          const netBonus = isSavingsOrBrokerage ? computeNetBonusForSalary(m.salaryAtMonth) : 0;
          const annualBonus = isSavingsOrBrokerage && netBonus > 0 ? netBonus : m.salaryAtMonth * (bonusPercent / 100);

          let bonusContribPct: number | undefined =
            typeof account.bonusContributionPercent === 'number' ? account.bonusContributionPercent : undefined;
          if (account.bonusContributionPercent === 'age-bracket' && account.ageBracketContributions) {
            bonusContribPct = getAgeBracketPercentage(m.ageAtStartOfCurrentYear, account.ageBracketContributions);
          }
          if (bonusContribPct !== undefined && bonusContribPct > 0) {
            contribution += annualBonus * (bonusContribPct / 100);
          }
        }
      }

      // ── January-only events ───────────────────────────────────
      if (m.isJanuary && m.calendarYear !== lastYearCalculated) {
        lastYearCalculated = m.calendarYear;
        annualBridgingWithdrawal = 0;

        // Bridging withdrawal (deterministic — based on salary replacement)
        if (isBrokerage && month >= fireYearStartMonth && m.isInBridgingPhase) {
          const hypotheticalSalary = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, m.januarysSeen) : 0;
          const targetIncome = hypotheticalSalary * (salaryReplacementRateValue / 100);
          const statePensionOffset = (includeStatePension && m.ageAtMonth >= statePensionAgeValue) ? statePensionAnnual : 0;
          annualBridgingWithdrawal = Math.max(0, targetIncome - statePensionOffset);
        }

        // Pension lump sum withdrawal (balance-dependent — handled in sim loop)
        if (isPension && enablePensionLumpSum !== false && m.ageAtMonth >= pensionLumpSumAgeValue && m.ageAtMonth < (pensionLumpSumAgeValue + 1)) {
          pensionLumpSumWithdraw = true;
        }

        // House deposit withdrawal
        if (enableHouseWithdrawal && houseWithdrawalAge !== undefined && houseDepositCalculation && m.ageAtMonth >= houseWithdrawalAge && m.ageAtMonth < (houseWithdrawalAge + 1)) {
          const totalHouseDeposit = houseDepositCalculation.depositRequired;
          const brokerageRate = houseDepositFromBrokerageRate ?? 50;
          if (isBrokerage) {
            fixedWithdrawal = totalHouseDeposit * (brokerageRate / 100);
          } else if (isSavings) {
            fixedWithdrawal = totalHouseDeposit * ((100 - brokerageRate) / 100);
          }
        }

        // Lump sum contribution (pension lump sum allocation incoming to savings/brokerage)
        if (!isPension && enablePensionLumpSum !== false && m.ageAtMonth >= pensionLumpSumAgeValue && m.ageAtMonth < (pensionLumpSumAgeValue + 1) && lumpSumAllocation > 0) {
          lumpSumContrib = lumpSumAllocation;
        }

        // Windfalls
        if (windfalls && windfalls.length > 0) {
          for (const wf of windfalls) {
            if (wf.age === m.ageAtMonth && wf.destination === account.name && wf.amount > 0) {
              lumpSumContrib += wf.amount;
            }
          }
        }
      }

      // Pension drawdown (balance-dependent — flag for sim loop)
      if (isPension && m.isInDrawdownPhase) {
        pensionDrawdown = true;
        // Determine effective rate
        if (m.ageAtMonth >= 71) {
          pensionDrawdownRate = Math.max(withdrawalRateValue, 5);
        } else if (m.ageAtMonth >= 61) {
          pensionDrawdownRate = Math.max(withdrawalRateValue, 4);
        } else {
          pensionDrawdownRate = withdrawalRateValue;
        }
      }

      // Bridging: monthly withdrawal (spread /12)
      let bridgingMonthlyWithdrawal = 0;
      if (isBrokerage && month >= fireYearStartMonth && m.isInBridgingPhase && annualBridgingWithdrawal > 0) {
        bridgingMonthlyWithdrawal = annualBridgingWithdrawal / 12;
      }

      months[month] = {
        contribution: contribution + lumpSumContrib,
        netSalary: m.netSalary,
        baseNetSalary: m.baseNetSalary,
        isJanuary: m.isJanuary,
        yearIndex: m.yearIndex,
        age: m.ageAtMonth,
        phase: m.phase,
        fixedWithdrawal: fixedWithdrawal + bridgingMonthlyWithdrawal,
        pensionDrawdown,
        pensionLumpSumWithdraw,
        lumpSumContribution: lumpSumContrib,
        annualBridgingWithdrawal,
        pensionDrawdownRate,
        statePensionMonthly: m.statePensionMonthly,
        taxBandMultiplier: m.taxBandMultiplier,
      };
    }

    accountSchedules.push({
      name: account.name,
      months,
      isPension,
      isBrokerage,
      isSavings,
      initialBalance: account.currentBalance,
      etfAllocationPct,
      pensionLumpSumMaxAmountValue,
    });
  }

  // Build per-year metadata
  const ages: number[] = new Array(numYears);
  const yearPhases: ('working' | 'bridging' | 'drawdown')[] = new Array(numYears);
  const yearTaxBandMultiplier: number[] = new Array(numYears);
  const yearStatePensionIncome: number[] = new Array(numYears).fill(0);

  // Single pass: record per-year data from month metadata
  let lastYearIdx = -1;
  for (let month = 0; month < totalMonths; month++) {
    const m = monthMetas[month];
    if (m.yearIndex !== lastYearIdx) {
      lastYearIdx = m.yearIndex;
      ages[m.yearIndex] = m.ageAtMonth;
      yearPhases[m.yearIndex] = m.phase;
      yearTaxBandMultiplier[m.yearIndex] = m.taxBandMultiplier;
    }
    yearStatePensionIncome[m.yearIndex] += m.statePensionMonthly;
  }

  return { accounts: accountSchedules, numYears, ages, yearPhases, yearTaxBandMultiplier, yearStatePensionIncome };
}

// ─── Lightweight pension balance estimator ──────────────────────────
// Mirrors estimatePensionBalanceAtAge from calculations.ts but avoids
// importing the private function. Only tracks balance — no arrays.

function estimatePensionBalanceLite(
  account: AccountInput,
  targetLumpSumAge: number,
  currentAge: number,
  currentSalary: number | undefined,
  annualSalaryIncrease: number | undefined,
  firstYearMonths: number,
  monthDate: Date,
  bonusPercent: number | undefined,
  fireAge: number,
): number {
  const monthlyRate = account.expectedReturn / 100 / 12;
  const fireAgeValue = fireAge;
  let balance = account.currentBalance;
  const md = new Date(monthDate);

  let januarysSeen = md.getMonth() === 0 ? 1 : 0;
  let ageAtStartOfCurrentYear = currentAge;
  let lastYearBracketUpdated = -1;

  const maxMonths = firstYearMonths + (targetLumpSumAge - currentAge + 2) * 12;

  // Fire year start month
  const monthReachFire = firstYearMonths + (fireAgeValue - currentAge - 1) * 12;
  let tempDate = new Date(md);
  for (let i = 0; i < monthReachFire; i++) {
    tempDate.setMonth(tempDate.getMonth() + 1);
  }
  const retCalMonth = tempDate.getMonth();
  const mToNextJan = retCalMonth === 0 ? 12 : (12 - retCalMonth);
  const fireYearStartMonth = monthReachFire + mToNextJan;

  for (let month = 0; month < maxMonths; month++) {
    if (month > 0 && md.getMonth() === 0) januarysSeen++;

    const birthdays = month >= firstYearMonths ? 1 + Math.floor((month - firstYearMonths) / 12) : 0;
    const ageAtMonth = currentAge + birthdays;
    const isJanuary = md.getMonth() === 0;
    const currentYear = md.getFullYear();

    if (isJanuary && currentYear !== lastYearBracketUpdated) {
      ageAtStartOfCurrentYear = ageAtMonth;
      lastYearBracketUpdated = currentYear;
    }

    if (ageAtMonth >= targetLumpSumAge && isJanuary && month > 0) return balance;

    let salaryAtMonth = currentSalary || 0;
    if (currentSalary && annualSalaryIncrease !== undefined) {
      salaryAtMonth = currentSalary * Math.pow(1 + annualSalaryIncrease / 100, januarysSeen);
    }

    let monthlyContribution = 0;
    if (month < fireYearStartMonth) {
      if (account.isSalaryPercentage && currentSalary && annualSalaryIncrease !== undefined) {
        let pct = account.monthlyContribution;
        if (account.ageBracketContributions) {
          pct = getAgeBracketPercentage(ageAtStartOfCurrentYear, account.ageBracketContributions);
        }
        monthlyContribution = (salaryAtMonth / 12) * (pct / 100);
        if (account.employerAgeBracketContributions) {
          const ep = getEmployerAgeBracketPercentage(ageAtStartOfCurrentYear, account.employerAgeBracketContributions);
          if (ep > 0) monthlyContribution += (salaryAtMonth / 12) * (ep / 100);
        }
      } else {
        monthlyContribution = account.monthlyContribution;
      }

      const isDecember = md.getMonth() === 11;
      if (isDecember && bonusPercent !== undefined && bonusPercent > 0 && account.bonusContributionPercent !== undefined) {
        const annualBonus = salaryAtMonth * (bonusPercent / 100);
        let bcp: number | undefined =
          typeof account.bonusContributionPercent === 'number' ? account.bonusContributionPercent : undefined;
        if (account.bonusContributionPercent === 'age-bracket' && account.ageBracketContributions) {
          bcp = getAgeBracketPercentage(ageAtStartOfCurrentYear, account.ageBracketContributions);
        }
        if (bcp !== undefined && bcp > 0) monthlyContribution += annualBonus * (bcp / 100);
      }
    }

    balance += balance * monthlyRate + monthlyContribution;
    md.setMonth(md.getMonth() + 1);
  }

  return balance;
}

// ─── MC simulation loop ─────────────────────────────────────────────

/**
 * Run a single Monte Carlo simulation using the pre-computed schedule.
 * Only the monthly interest rate varies (derived from the sampled return).
 */
function runMCSimulation(
  schedule: FullSchedule,
  sampledMonthlyRates: number[], // one per account
): MCSimResult {
  const { accounts: acctSchedules, numYears } = schedule;
  const numAccounts = acctSchedules.length;

  // Per-year accumulation (direct — no intermediate monthly arrays)
  const yearlyTotalBalances = new Float64Array(numYears);
  const yearlyNetIncomes = new Float64Array(numYears);

  // Per-account state
  const balances = new Float64Array(numAccounts);
  const costBases = new Float64Array(numAccounts);
  const etfBalances = new Float64Array(numAccounts);
  const stockBalances = new Float64Array(numAccounts);
  const etfCostBases = new Float64Array(numAccounts);
  const stockCostBases = new Float64Array(numAccounts);
  const ddCounters = new Int32Array(numAccounts);
  const cgtExemptionUsed = new Float64Array(numAccounts);
  const annualPensionWithdrawals = new Float64Array(numAccounts);

  const deemedDisposalPeriodMonths = DEEMED_DISPOSAL_PERIOD_YEARS * 12;

  for (let i = 0; i < numAccounts; i++) {
    const as = acctSchedules[i];
    balances[i] = as.initialBalance;
    costBases[i] = as.isBrokerage ? as.initialBalance : 0;
    etfBalances[i] = as.isBrokerage ? as.initialBalance * as.etfAllocationPct : 0;
    stockBalances[i] = as.isBrokerage ? as.initialBalance * (1 - as.etfAllocationPct) : 0;
    etfCostBases[i] = etfBalances[i];
    stockCostBases[i] = stockBalances[i];
  }

  const totalMonths = acctSchedules[0].months.length;
  // Track per-year net salary accumulator (working phase income)
  let yearNetSalaryAccum = 0;
  // Track per-year brokerage withdrawal + tax for bridging net income
  let yearBrokerageWithdrawal = 0;
  let yearBrokerageWithdrawalTax = 0;
  // Track per-year pension withdrawal for drawdown net income
  let yearPensionWithdrawal = 0;
  let currentYearIdx = 0;

  for (let month = 0; month < totalMonths; month++) {
    // Use first account's schedule for shared month metadata
    const sm = acctSchedules[0].months[month];
    const yearIdx = sm.yearIndex;

    // Year boundary — flush previous year's net income
    if (yearIdx !== currentYearIdx) {
      flushYearIncome(schedule, currentYearIdx, yearNetSalaryAccum, yearBrokerageWithdrawal, yearBrokerageWithdrawalTax, yearPensionWithdrawal, yearlyNetIncomes);
      yearNetSalaryAccum = 0;
      yearBrokerageWithdrawal = 0;
      yearBrokerageWithdrawalTax = 0;
      yearPensionWithdrawal = 0;
      currentYearIdx = yearIdx;
    }

    // Accumulate working-phase net salary (from first account schedule)
    yearNetSalaryAccum += sm.netSalary;

    for (let a = 0; a < numAccounts; a++) {
      const as = acctSchedules[a];
      const ms = as.months[month];
      const monthlyRate = sampledMonthlyRates[a];
      const balance = balances[a];

      let monthWithdrawal = 0;


      // ── January resets ────────────────────────────────────────
      if (ms.isJanuary) {
        cgtExemptionUsed[a] = 0;
        annualPensionWithdrawals[a] = 0;

        // Pension drawdown: calculate annual withdrawal from balance
        if (as.isPension && ms.pensionDrawdown && ms.pensionDrawdownRate > 0) {
          annualPensionWithdrawals[a] = balances[a] * (ms.pensionDrawdownRate / 100);
        }

        // Pension lump sum withdrawal (balance-dependent)
        if (ms.pensionLumpSumWithdraw) {
          const lsAmt = Math.min(balances[a] * PENSION_LUMP_SUM_MAX_FRACTION, as.pensionLumpSumMaxAmountValue);
          monthWithdrawal = lsAmt;
          balances[a] -= monthWithdrawal;
        }

        // Fixed withdrawal (house deposit)
        if (ms.fixedWithdrawal > 0 && !ms.pensionDrawdown) {
          // House deposit is the fixedWithdrawal minus bridging component
          // fixedWithdrawal includes both house and bridging; separate them
          // Actually, fixedWithdrawal at this point includes bridging monthly /12
          // For house deposit, it's set in January only alongside bridging
          // Let's just apply fixedWithdrawal below in the recurring section
        }
      }

      // ── Recurring withdrawals ─────────────────────────────────
      if (as.isPension && ms.pensionDrawdown && annualPensionWithdrawals[a] > 0) {
        monthWithdrawal = annualPensionWithdrawals[a] / 12;
        balances[a] -= monthWithdrawal;
        yearPensionWithdrawal += monthWithdrawal;
      } else if (ms.fixedWithdrawal > 0) {
        monthWithdrawal = ms.fixedWithdrawal;
        balances[a] -= monthWithdrawal;
        if (as.isBrokerage) {
          yearBrokerageWithdrawal += monthWithdrawal;
        }
      }

      // ── Cost basis / sub-balance tracking for brokerage ───────
      let etfGainRatio = 0, stockGainRatio = 0;
      const preWithdrawalEtfBal = etfBalances[a];
      const preWithdrawalStockBal = stockBalances[a];

      if (as.isBrokerage && monthWithdrawal > 0 && balance > 0) {
        costBases[a] = Math.max(0, costBases[a] - monthWithdrawal * (costBases[a] / balance));
        etfGainRatio = etfBalances[a] > 0 ? Math.max(0, Math.min(1, (etfBalances[a] - etfCostBases[a]) / etfBalances[a])) : 0;
        stockGainRatio = stockBalances[a] > 0 ? Math.max(0, Math.min(1, (stockBalances[a] - stockCostBases[a]) / stockBalances[a])) : 0;

        const totalSubBal = etfBalances[a] + stockBalances[a];
        if (totalSubBal > 0) {
          const etfWd = monthWithdrawal * (etfBalances[a] / totalSubBal);
          const stockWd = monthWithdrawal * (stockBalances[a] / totalSubBal);
          if (etfBalances[a] > 0) {
            etfCostBases[a] = Math.max(0, etfCostBases[a] - etfWd * (etfCostBases[a] / etfBalances[a]));
            etfBalances[a] -= etfWd;
          }
          if (stockBalances[a] > 0) {
            stockCostBases[a] = Math.max(0, stockCostBases[a] - stockWd * (stockCostBases[a] / stockBalances[a]));
            stockBalances[a] -= stockWd;
          }
        }

        // Compute brokerage withdrawal tax for net income
        if (monthWithdrawal > 0) {
          const remainingExemption = Math.max(0, CGT_ANNUAL_EXEMPTION - cgtExemptionUsed[a]);
          const taxResult = calculateBrokerageWithdrawalTax(
            monthWithdrawal, preWithdrawalEtfBal, preWithdrawalStockBal,
            etfGainRatio, stockGainRatio, remainingExemption,
          );
          yearBrokerageWithdrawalTax += taxResult.totalTax;
          cgtExemptionUsed[a] += taxResult.cgtExemptionUsed;
        }
      }

      // ── Contributions ─────────────────────────────────────────
      const monthContribution = ms.contribution;
      if (as.isBrokerage && monthContribution > 0) {
        costBases[a] += monthContribution;
        const etfC = monthContribution * as.etfAllocationPct;
        const stockC = monthContribution * (1 - as.etfAllocationPct);
        etfCostBases[a] += etfC;
        stockCostBases[a] += stockC;
        etfBalances[a] += etfC;
        stockBalances[a] += stockC;
      }

      // ── Interest ──────────────────────────────────────────────
      const monthInterest = balances[a] * monthlyRate;
      let netInterest = monthInterest;
      if (as.isSavings && monthInterest > 0) {
        netInterest = monthInterest * (1 - DIRT_RATE);
      }
      balances[a] += netInterest + monthContribution;

      // ETF/stock sub-balance growth
      if (as.isBrokerage) {
        etfBalances[a] += etfBalances[a] * monthlyRate;
        stockBalances[a] += stockBalances[a] * monthlyRate;
      }

      // ── Deemed disposal ───────────────────────────────────────
      if (as.isBrokerage && etfBalances[a] > 0) {
        ddCounters[a]++;
        if (ddCounters[a] >= deemedDisposalPeriodMonths) {
          const etfGain = Math.max(0, etfBalances[a] - etfCostBases[a]);
          if (etfGain > 0) {
            const ddResult = calculateExitTax(etfGain, 1);
            etfBalances[a] -= ddResult.exitTax;
            balances[a] -= ddResult.exitTax;
            etfCostBases[a] = etfBalances[a];
          }
          ddCounters[a] = 0;
        }
      }
    }

    // Record ending balances at year end (last month in a calendar year)
    const nextMonth = month + 1;
    const isLastMonthOfYear = nextMonth >= totalMonths || acctSchedules[0].months[nextMonth].yearIndex !== yearIdx;
    if (isLastMonthOfYear) {
      let totalBal = 0;
      for (let a = 0; a < numAccounts; a++) totalBal += balances[a];
      yearlyTotalBalances[yearIdx] = totalBal;

      // Flush the current year's net income
      flushYearIncome(schedule, yearIdx, yearNetSalaryAccum, yearBrokerageWithdrawal, yearBrokerageWithdrawalTax, yearPensionWithdrawal, yearlyNetIncomes);
      yearNetSalaryAccum = 0;
      yearBrokerageWithdrawal = 0;
      yearBrokerageWithdrawalTax = 0;
      yearPensionWithdrawal = 0;
      currentYearIdx = yearIdx + 1;
    }
  }

  return {
    yearlyTotalBalances: Array.from(yearlyTotalBalances),
    yearlyNetIncomes: Array.from(yearlyNetIncomes),
  };
}

/**
 * Flush accumulated monthly income data into the yearly net income array.
 * Mirrors the combineYearlyData logic for net income calculation per phase.
 */
function flushYearIncome(
  schedule: FullSchedule,
  yearIdx: number,
  yearNetSalary: number,
  yearBrokerageWithdrawal: number,
  yearBrokerageWithdrawalTax: number,
  yearPensionWithdrawal: number,
  yearlyNetIncomes: Float64Array,
): void {
  const phase = schedule.yearPhases[yearIdx];
  const age = schedule.ages[yearIdx];
  const taxBandMultiplier = schedule.yearTaxBandMultiplier[yearIdx];
  const annualStatePensionIncome = schedule.yearStatePensionIncome[yearIdx];

  let netIncome = 0;

  if (phase === 'working') {
    netIncome = yearNetSalary;
  } else if (phase === 'bridging') {
    if (yearBrokerageWithdrawal > 0) {
      netIncome = yearBrokerageWithdrawal - yearBrokerageWithdrawalTax;
    }
    if (annualStatePensionIncome > 0) {
      const spTax = calculatePensionWithdrawalTaxLite(annualStatePensionIncome, true, age, taxBandMultiplier);
      netIncome += spTax.netWithdrawal;
    }
  } else {
    // drawdown: tax on combined pension withdrawal + state pension
    // yearPensionWithdrawal was accumulated monthly, already the annual total
    const annualPensionWd = yearPensionWithdrawal; // this is already the annual sum of monthly withdrawals
    const combinedIncome = annualPensionWd + annualStatePensionIncome;
    if (combinedIncome > 0) {
      const taxR = calculatePensionWithdrawalTaxLite(combinedIncome, true, age, taxBandMultiplier);
      netIncome = taxR.netWithdrawal;
    }
  }

  yearlyNetIncomes[yearIdx] = netIncome;
}

// ─── Box-Muller transform ───────────────────────────────────────────

function boxMullerRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function sampleReturn(mean: number, stdDev: number): number {
  return mean + stdDev * boxMullerRandom();
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

// ─── Public entry point ─────────────────────────────────────────────

/**
 * Run the full Monte Carlo simulation using the optimised engine.
 * Called from the MC web worker.
 */
export function runMonteCarloSimulation(
  baseOptions: PortfolioGrowthOptions,
  simulations: number,
  returnVolatility: number,
): MCResult {
  // Build schedule once
  const schedule = buildDeterministicSchedule(baseOptions);
  const { numYears, ages, accounts: acctSchedules } = schedule;
  const numAccounts = acctSchedules.length;

  // Pre-allocate result collectors
  const allTotals: number[][] = new Array(simulations);
  const allIncomes: number[][] = new Array(simulations);

  for (let sim = 0; sim < simulations; sim++) {
    // Sample one effective annual return per account per simulation
    const sampledMonthlyRates: number[] = new Array(numAccounts);
    for (let a = 0; a < numAccounts; a++) {
      const sampledAnnual = sampleReturn(
        baseOptions.accounts[a].expectedReturn,
        returnVolatility,
      );
      sampledMonthlyRates[a] = sampledAnnual / 100 / 12;
    }

    const result = runMCSimulation(schedule, sampledMonthlyRates);
    allTotals[sim] = result.yearlyTotalBalances;
    allIncomes[sim] = result.yearlyNetIncomes;
  }

  // Compute percentiles per year
  const p10: number[] = new Array(numYears);
  const p25: number[] = new Array(numYears);
  const p50: number[] = new Array(numYears);
  const p75: number[] = new Array(numYears);
  const p90: number[] = new Array(numYears);
  const incP10: number[] = new Array(numYears);
  const incP25: number[] = new Array(numYears);
  const incP50: number[] = new Array(numYears);
  const incP75: number[] = new Array(numYears);
  const incP90: number[] = new Array(numYears);

  // Reusable sort buffers
  const valBuf: number[] = new Array(simulations);
  const incBuf: number[] = new Array(simulations);

  for (let y = 0; y < numYears; y++) {
    for (let s = 0; s < simulations; s++) {
      valBuf[s] = allTotals[s][y];
      incBuf[s] = allIncomes[s][y];
    }
    valBuf.sort((a, b) => a - b);
    incBuf.sort((a, b) => a - b);

    p10[y] = percentile(valBuf, 10);
    p25[y] = percentile(valBuf, 25);
    p50[y] = percentile(valBuf, 50);
    p75[y] = percentile(valBuf, 75);
    p90[y] = percentile(valBuf, 90);

    incP10[y] = percentile(incBuf, 10);
    incP25[y] = percentile(incBuf, 25);
    incP50[y] = percentile(incBuf, 50);
    incP75[y] = percentile(incBuf, 75);
    incP90[y] = percentile(incBuf, 90);
  }

  return {
    percentiles: { p10, p25, p50, p75, p90, ages },
    incomePercentiles: { p10: incP10, p25: incP25, p50: incP50, p75: incP75, p90: incP90, ages },
  };
}
