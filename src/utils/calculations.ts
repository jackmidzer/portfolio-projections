import { AccountResults, YearlyBreakdown, PortfolioResults, AgeBracketContributions, EmployerAgeBracketContributions, MonthlyBreakdown, MilestoneSnapshot, PensionLumpSumTaxBreakdown, AccountGrowthOptions, PortfolioGrowthOptions } from '../types';
import { calculateNetSalary, calculatePensionWithdrawalTax, calculateBrokerageCapitalGainsTax, calculateBonusTaxBurden, calculateNetBonus, calculateDirtTax, calculatePensionLumpSumTax } from './taxCalculations';
import { isBridgingPhase, isDrawdownPhase, getPhaseType } from './phaseHelpers';

/**
 * Get the contribution percentage for a given age from age bracket contributions
 */
function getAgeBracketPercentage(age: number, brackets: AgeBracketContributions): number {
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
function getEmployerAgeBracketPercentage(age: number, brackets: EmployerAgeBracketContributions): number {
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
  const salaryReplacementRateValue = salaryReplacementRate ?? 80;
  const statePensionAgeValue = statePensionAge ?? 66;
  const statePensionWeekly = statePensionWeeklyAmount ?? 299.30;
  const statePensionAnnual = statePensionWeekly * 52;
  const statePensionMonthly = statePensionAnnual / 12;

  // Store all monthly data throughout the entire time horizon
  const allMonthlyData: MonthlyBreakdown[] = [];
  let currentBalance = account.currentBalance;

  // Track cost basis for brokerage account (cumulative contributions, proportionally reduced on withdrawal)
  // Initialised to currentBalance — assumes the opening balance is entirely cost (no unrealised gain)
  let costBasis = isBrokerageAccount ? account.currentBalance : 0;

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

  // Main monthly loop - iterate through all months in the time horizon
  for (let month = 0; month < totalMonths; month++) {
    
    // Increment January counter if we've entered a new January since last month
    if (month > 0 && monthDate.getMonth() === 0) {
      januarysSeen++;
    }
    
    // Calculate current age based on number of full birthdays passed
    // Birthdays occur every 12 months starting after the pro-rated first year
    const birthdays = month >= firstYearMonths ? 1 + Math.floor((month - firstYearMonths) / 12) : 0;
    const ageAtMonth = currentAge + birthdays;
    
    // Calculate salary at this point - it increases each January
    let salaryAtMonth = currentSalary || 0;
    if (currentSalary && annualSalaryIncrease !== undefined) {
      // Salary increases each January
      salaryAtMonth = currentSalary * Math.pow(1 + annualSalaryIncrease / 100, januarysSeen);
    }

    const isJanuary = monthDate.getMonth() === 0;
    const currentYear = monthDate.getFullYear();
    
    // Update age bracket for new calendar year (defer bracket changes to January)
    if (isJanuary && currentYear !== lastYearBracketUpdated) {
      ageAtStartOfCurrentYear = ageAtMonth;
      lastYearBracketUpdated = currentYear;
    }
    
    // Calculate monthly net salary (net income) - needed for Savings/Brokerage contributions
    // Note: This is simplified to show gross salary when tax calc is disabled,
    // and uses tax calculation results when enabled
    let monthlyNetSalary = 0;
    let baseMonthlyNetSalary = 0;  // Track base salary net (without bonus) for contribution calculations
    let monthlyTax = 0;
    let monthlyGrossIncome = 0;
    let monthlyPensionDeduction = 0;
    
    if (salaryAtMonth > 0 && taxInputs) {
      // Use tax calculation: calculate annual net salary then divide by 12
      // Calculate dynamic pension contribution based on current age and pension age brackets
      let dynamicPensionContribution = taxInputs.pensionContribution;
      
      if (pensionAgeBracketContributions && salaryAtMonth > 0) {
        // Get the pension contribution percentage based on age at start of current year
        const pensionPercent = getAgeBracketPercentage(ageAtStartOfCurrentYear, pensionAgeBracketContributions);
        dynamicPensionContribution = (salaryAtMonth * pensionPercent) / 100;
      }
      
      const annualTaxResult = calculateNetSalary({
        grossSalary: salaryAtMonth,
        pensionContribution: dynamicPensionContribution,
        bikValue: taxInputs.bikValue || 0,
      });
      
      // Monthly tax = (PAYE + USC + PRSI) / 12, except in December when bonus is included
      const baseMonthlyTax = (annualTaxResult.payeTax + annualTaxResult.usc + annualTaxResult.prsi) / 12;
      const baseMonthlySalaryPension = dynamicPensionContribution / 12;
      
      // Check if this is December and bonus should be applied
      const isDecemberMonth = monthDate.getMonth() === 11;
      const hasBonusPercent = bonusPercent !== undefined && bonusPercent > 0;
      
      monthlyGrossIncome = salaryAtMonth / 12;
      monthlyPensionDeduction = baseMonthlySalaryPension;
      monthlyTax = baseMonthlyTax;
      
      // Calculate base monthly net salary (without bonus) for use in contribution calculations
      baseMonthlyNetSalary = (salaryAtMonth / 12) - baseMonthlyTax - baseMonthlySalaryPension;
      
      if (isDecemberMonth && hasBonusPercent) {
        // Calculate additional tax burden from bonus in December
        const pensionPercent = pensionAgeBracketContributions
          ? getAgeBracketPercentage(ageAtStartOfCurrentYear, pensionAgeBracketContributions)
          : (dynamicPensionContribution / salaryAtMonth) * 100;
        
        const bonusTaxBurden = calculateBonusTaxBurden(
          salaryAtMonth,
          bonusPercent,
          pensionPercent,
          taxInputs.bikValue || 0
        );
        
        monthlyTax = baseMonthlyTax + bonusTaxBurden;
        
        // Include full bonus amount in the gross income for December
        const bonusAmount = salaryAtMonth * (bonusPercent / 100);
        monthlyGrossIncome = salaryAtMonth / 12 + bonusAmount;
        
        // Include bonus pension deduction in December
        const bonusPensionDeduction = (bonusAmount * pensionPercent) / 100;
        monthlyPensionDeduction = baseMonthlySalaryPension + bonusPensionDeduction;
      }
      
      monthlyNetSalary = monthlyGrossIncome - monthlyTax - monthlyPensionDeduction;
    } else if (salaryAtMonth > 0) {
      // Simple case: show gross salary as net income (no tax applied)
      monthlyGrossIncome = salaryAtMonth / 12;
      monthlyNetSalary = salaryAtMonth / 12;
      baseMonthlyNetSalary = salaryAtMonth / 12;
      monthlyTax = 0;
      monthlyPensionDeduction = 0;
    }
    
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

    if (isJanuary) {
      // [PENSION PHASE] Pension lump sum: withdraw up to 25% of balance (capped at user max) at pensionLumpSumAge - ONE TIME ONLY
      if (isPensionAccount && enablePensionLumpSum !== false && ageAtMonth >= pensionLumpSumAgeValue && ageAtMonth < (pensionLumpSumAgeValue + 1)) {
        const lumpSumAmount = Math.min(monthStartBalance * 0.25, pensionLumpSumMaxAmountValue);
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

    // Compute brokerage gain ratio (proportion of the withdrawal that is capital gain) and
    // proportionally reduce the cost basis for any withdrawal this month.
    // Must be done BEFORE adding contributions so the ratio uses the pre-withdrawal cost basis.
    let brokerageGainRatio = 0;
    if (isBrokerageAccount && monthWithdrawal > 0 && monthStartBalance > 0) {
      brokerageGainRatio = Math.max(0, Math.min(1, (monthStartBalance - costBasis) / monthStartBalance));
      // Reduce cost basis by the proportion of the balance that was withdrawn
      costBasis = Math.max(0, costBasis - monthWithdrawal * (costBasis / monthStartBalance));
    }

    // Calculate monthly contribution
    let monthlyContribution = 0;
    // [WORKING PHASE] Contributions are made during the working phase (before FIRE)
    if (month < fireYearStartMonth) {
      if (account.isSalaryPercentage && currentSalary && annualSalaryIncrease !== undefined) {
        // For salary-based contributions (e.g., Pension with age brackets)
        let contributionPercentage = account.monthlyContribution;
        if (account.ageBracketContributions) {
          // Use age at start of calendar year to defer bracket increases until January
          contributionPercentage = getAgeBracketPercentage(ageAtStartOfCurrentYear, account.ageBracketContributions);
        }
        
        // Monthly contribution uses net income for Savings/Brokerage, gross for Pension
        // For non-pension accounts, use baseMonthlyNetSalary to avoid including bonus in regular contribution
        const contributionBase = isPensionAccount ? (salaryAtMonth / 12) : baseMonthlyNetSalary;
        monthlyContribution = contributionBase * (contributionPercentage / 100);
        
        // Add employer contribution if present (Pension only, uses gross salary, age-bracket-based)
        if (account.employerAgeBracketContributions) {
          const employerPercent = getEmployerAgeBracketPercentage(ageAtStartOfCurrentYear, account.employerAgeBracketContributions);
          if (employerPercent > 0) {
            monthlyContribution += (salaryAtMonth / 12) * (employerPercent / 100);
          }
        }
      } else {
        // Fixed monthly contribution
        monthlyContribution = account.monthlyContribution;
      }
      
      // Add bonus contribution from bonus salary (December only)
      const isDecember = monthDate.getMonth() === 11;
      if (isDecember && bonusPercent !== undefined && bonusPercent > 0 && account.bonusContributionPercent !== undefined) {
        // For Savings/Brokerage: use net bonus; for Pension: use gross bonus (tax-relievable)
        const isSavingsOrBrokerage = account.name === 'Savings' || account.name === 'Brokerage';
        const annualBonus = isSavingsOrBrokerage && netBonusValue !== undefined ? netBonusValue : salaryAtMonth * (bonusPercent / 100);
        
        // Handle 'age-bracket' sentinel: resolve to the current age-bracket percentage
        let bonusContributionPercent: number | undefined =
          typeof account.bonusContributionPercent === 'number' ? account.bonusContributionPercent : undefined;

        if (account.bonusContributionPercent === 'age-bracket' && account.ageBracketContributions) {
          // Use age at start of calendar year to defer bracket increases until January
          bonusContributionPercent = getAgeBracketPercentage(ageAtStartOfCurrentYear, account.ageBracketContributions);
        }
        
        // Only add bonus contribution if percentage is positive
        if (bonusContributionPercent !== undefined && bonusContributionPercent > 0) {
          const bonusContribution = annualBonus * (bonusContributionPercent / 100);
          monthlyContribution += bonusContribution;
        }
      }
    }

    // Add lump sum allocation to contributions
    monthlyContribution += lumpSumContribution;

    // Increase brokerage cost basis by new contributions (they represent the cost of acquiring new units)
    if (isBrokerageAccount && monthlyContribution > 0) {
      costBasis += monthlyContribution;
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

    // Format month/year as 'FEB 2026'
    const monthLabel = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

    // Calculate withdrawal tax based on account type and phase
    let withdrawalTax = 0;
    let withdrawalNetAmount = monthWithdrawal;
    let withdrawalPhase: 'lumpSum' | 'bridging' | 'drawdown' | undefined;

    // Determine withdrawal phase and apply account-specific tax
    if (monthWithdrawal > 0) {
      // Pension lump sum withdrawal
      if (isPensionAccount && ageAtMonth >= pensionLumpSumAgeValue && ageAtMonth < (pensionLumpSumAgeValue + 1)) {
        withdrawalPhase = 'lumpSum';
        // Lump sum withdrawals typically have special tax treatment (e.g. first €200k tax-free).
        // Here we treat the modeled lump sum as tax-free to avoid incorrectly applying full income tax.
        withdrawalTax = 0;
        withdrawalNetAmount = monthWithdrawal;
      }
      // Savings/Brokerage lump sum allocation from pension
      else if (!isPensionAccount && ageAtMonth >= pensionLumpSumAgeValue && ageAtMonth < (pensionLumpSumAgeValue + 1) && lumpSumContribution > 0) {
        withdrawalPhase = 'lumpSum';
        // Lump sum allocation is not taxed (it's receiving funds from pension)
        withdrawalTax = 0;
        withdrawalNetAmount = monthWithdrawal;
      }
      // Pension phase withdrawal (regular pension withdrawals)
      else if (isPensionAccount && isInDrawdownPhase) {
        withdrawalPhase = 'drawdown';
        // Pension withdrawals: PAYE + USC + PRSI (if age < 66) + €245 age credit
        const taxResult = calculatePensionWithdrawalTax(monthWithdrawal, true, ageAtMonth);
        withdrawalTax = taxResult.totalTax;
        withdrawalNetAmount = taxResult.netWithdrawal;
      }
      // Brokerage early retirement withdrawal
      else if (isBrokerageAccount && isInBridgingPhase) {
        withdrawalPhase = 'bridging';
        // Brokerage withdrawals: 33% CGT on the gain portion only
        const taxResult = calculateBrokerageCapitalGainsTax(monthWithdrawal, brokerageGainRatio);
        withdrawalTax = taxResult.cgt;
        withdrawalNetAmount = taxResult.netWithdrawal;
      }
      // House deposit withdrawal (from Brokerage or Savings)
      else if (enableHouseWithdrawal && houseWithdrawalAge !== undefined && ageAtMonth >= houseWithdrawalAge && ageAtMonth < (houseWithdrawalAge + 1)) {
        if (isBrokerageAccount) {
          withdrawalPhase = 'bridging'; // Treat house withdrawal from brokerage as bridging withdrawal
          // Brokerage withdrawals: 33% CGT on the gain portion only
          const taxResult = calculateBrokerageCapitalGainsTax(monthWithdrawal, brokerageGainRatio);
          withdrawalTax = taxResult.cgt;
          withdrawalNetAmount = taxResult.netWithdrawal;
        } else {
          // Savings account house withdrawal (no tax on savings)
          withdrawalPhase = undefined;
          withdrawalTax = 0;
          withdrawalNetAmount = monthWithdrawal;
        }
      }
    }



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
      statePensionIncome: monthStatePensionIncome > 0 ? monthStatePensionIncome : undefined,
    });

    // Advance to next month
    monthDate.setMonth(monthDate.getMonth() + 1);
  }

  // Now aggregate monthly data into yearly breakdowns by calendar year
  const yearlyData: YearlyBreakdown[] = [];
  
  // Group months by calendar year extracted from monthYear string (e.g., "FEB 2026" -> 2026)
  const monthsByYear = new Map<number, typeof allMonthlyData>();
  allMonthlyData.forEach(monthData => {
    // Extract year from monthYear string (e.g., "FEB 2026" -> 2026)
    const yearMatch = monthData.monthYear.match(/\d{4}$/);
    const calendarYear = yearMatch ? parseInt(yearMatch[0], 10) : 2026;
    
    if (!monthsByYear.has(calendarYear)) {
      monthsByYear.set(calendarYear, []);
    }
    monthsByYear.get(calendarYear)!.push(monthData);
  });
  
  // Process each calendar year in order
  const sortedYears = Array.from(monthsByYear.keys()).sort((a, b) => a - b);
  
  sortedYears.forEach(calendarYear => {
    const yearMonthlyData = monthsByYear.get(calendarYear) || [];
    
    // Renumber months to be 1-indexed within the calendar year
    const renumberedMonthlyData = yearMonthlyData.map((m, index) => ({
      ...m,
      month: index + 1,
    }));
    
    // Aggregate metrics for this calendar year
    const yearStartingBalance = renumberedMonthlyData[0]?.startingBalance ?? 0;
    const yearEndingBalance = renumberedMonthlyData[renumberedMonthlyData.length - 1]?.endingBalance ?? currentBalance;
    const yearContributions = renumberedMonthlyData.reduce((sum, m) => sum + m.contribution, 0);
    const yearInterest = renumberedMonthlyData.reduce((sum, m) => sum + m.interest, 0);
    const yearInterestTax = renumberedMonthlyData.reduce((sum, m) => sum + (m.interestTax || 0), 0);
    const yearWithdrawal = renumberedMonthlyData.reduce((sum, m) => sum + m.withdrawal, 0);
    const yearSalary = (renumberedMonthlyData[0]?.salary ?? 0) * 12; // Annual salary (convert from monthly)
    
    // Calculate age at the start of this calendar year
    // Find which month in allMonthlyData corresponds to the first month of this calendar year
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
      endingBalance: yearEndingBalance,
      monthlyData: renumberedMonthlyData,
      withdrawal: yearWithdrawal,
    });
  });

  // Calculate totals
  const totalContributions = yearlyData.reduce((sum, yd) => sum + yd.contributions, 0);
  const totalWithdrawals = allMonthlyData.reduce((sum, m) => sum + m.withdrawal, 0);
  const totalInterest = currentBalance - account.currentBalance - totalContributions + totalWithdrawals;

  return {
    accountName: account.name,
    yearlyData,
    totalContributions,
    totalInterest,
    finalBalance: currentBalance,
    totalCostBasis: isBrokerageAccount ? costBasis : undefined,
  };
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
      taxInputs.bikValue || 0
    );
    netBonusValue = netBonusResult.bonusNetSalary;
  }

  // First, calculate pension account to determine lump sum amount
  let lumpSumAmount = 0;
  if (pensionAccount) {
    const pensionResult = calculateAccountGrowth({
      account: pensionAccount,
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
      pensionLumpSumAmount: undefined,
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
      statePensionWeeklyAmount,
    });
    
    // Find the lump sum amount from the pension monthly data
    // Look for the first month when age >= pensionLumpSumAgeValue
    const firstYearMonths = monthsUntilNextBirthday || 12;
    const totalMonths = firstYearMonths + (timeHorizon - 1) * 12;
    
    for (let month = 0; month < totalMonths; month++) {
      const birthdays = month >= firstYearMonths ? 1 + Math.floor((month - firstYearMonths) / 12) : 0;
      const ageAtMonth = currentAge + birthdays;
      const monthIndexInYear = month >= firstYearMonths ? month - (firstYearMonths + (Math.floor((month - firstYearMonths) / 12)) * 12) : month;
      const isFirstMonthOfYear = monthIndexInYear === 0;
      
      if (ageAtMonth >= pensionLumpSumAgeValue && isFirstMonthOfYear) {
        // Find this month's data in yearly breakdown and monthly data
        let yearIndex = 0;
        if (month >= firstYearMonths) {
          yearIndex = 1 + Math.floor((month - firstYearMonths) / 12);
        }
        
        if (yearIndex < pensionResult.yearlyData.length) {
          const yearData = pensionResult.yearlyData[yearIndex];
          const monthZeroIndex = 0; // First month of the year
          if (monthZeroIndex < yearData.monthlyData.length) {
            const monthData = yearData.monthlyData[monthZeroIndex];
            lumpSumAmount = Math.min(monthData.startingBalance * 0.25, pensionLumpSumMaxAmountValue);
          }
        }
        break;
      }
    }
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
      statePensionWeeklyAmount,
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

  for (let year = 0; year < timeHorizon; year++) {
    const age = accountResults[0]?.yearlyData[year]?.age ?? 0;

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
        const spTaxR = calculatePensionWithdrawalTax(annualStatePensionIncome, true, age);
        netIncome += spTaxR.netWithdrawal;
      }
    } else if (phase === 'drawdown') {
      const pension = accountResults.find((r) => r.accountName === 'Pension');
      const pensionYd = pension?.yearlyData[year];
      const annualWithdrawal = pensionYd?.withdrawal || 0;
      // Calculate tax on combined pension withdrawal + state pension so progressive bands apply correctly
      const totalTaxableIncome = annualWithdrawal + annualStatePensionIncome;
      if (totalTaxableIncome > 0) {
        const taxR = calculatePensionWithdrawalTax(totalTaxableIncome, true, age);
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
