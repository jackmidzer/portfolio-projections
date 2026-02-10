import { AccountInput, AccountResults, YearlyBreakdown, PortfolioResults, AgeBracketContributions, MonthlyBreakdown } from '../types';

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
 * Calculate month-by-month breakdown for a single account with compound interest and monthly contributions
 * Results are then aggregated into yearly breakdowns while preserving monthly detail
 */
export function calculateAccountGrowth(
  account: AccountInput,
  timeHorizon: number,
  currentAge: number,
  currentSalary?: number,
  annualSalaryIncrease?: number,
  monthsUntilNextBirthday?: number,
  dateOfBirth?: Date,
  pensionAge?: number,
  withdrawalRate?: number,
  earlyRetirementAge?: number,
  salaryReplacementRate?: number,
  pensionLumpSumAge?: number,
  pensionLumpSumAmount?: number,
  useSalaryReplacementForPension?: boolean,
  bonusPercent?: number,
  houseWithdrawalAge?: number,
  enableHouseWithdrawal?: boolean,
  houseDepositPercent?: number,
  houseDepositFromBrokerageRate?: number
): AccountResults {
  const monthlyRate = account.expectedReturn / 100 / 12;
  const firstYearMonths = monthsUntilNextBirthday || 12;
  let totalMonths = firstYearMonths + (timeHorizon - 1) * 12;
  const isPensionAccount = account.name === 'Pension';
  const isBrokerageAccount = account.name === 'Brokerage';
  const pensionAgeValue = pensionAge ?? 65;
  const withdrawalRateValue = withdrawalRate ?? 4;
  const earlyRetirementAgeValue = earlyRetirementAge ?? 50;
  const salaryReplacementRateValue = salaryReplacementRate ?? 80;

  // Store all monthly data throughout the entire time horizon
  const allMonthlyData: MonthlyBreakdown[] = [];
  let currentBalance = account.currentBalance;
  
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

  // Calculate the month when user reaches early retirement age
  const monthReachEarlyRetirement = firstYearMonths + (earlyRetirementAgeValue - currentAge - 1) * 12;
  // Early retirement withdrawals start in the next January after reaching the age
  // Find which calendar month they turn the age
  let tempDate = new Date(monthDate);
  for (let i = 0; i < monthReachEarlyRetirement; i++) {
    tempDate.setMonth(tempDate.getMonth() + 1);
  }
  const retirementCalendarMonth = tempDate.getMonth(); // 0=Jan, 11=Dec
  // Calculate months until next January (0) from the retirement month
  const monthsToNextJanuary = retirementCalendarMonth === 0 ? 12 : (12 - retirementCalendarMonth);
  const earlyRetirementYearStartMonth = monthReachEarlyRetirement + monthsToNextJanuary;

  // Track January-based salary growth
  let januarysSeen = monthDate.getMonth() === 0 ? 1 : 0;

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

    // Determine if we should apply withdrawals (only in January, before interest and contributions)
    const isJanuary = monthDate.getMonth() === 0;
    let monthWithdrawal = 0;
    let lumpSumContribution = 0;
    const monthStartBalance = currentBalance;
    const lumpSumAgeValue = pensionLumpSumAge ?? 50;
    
    if (isJanuary) {
      // Pension lump sum: withdraw 25% of balance (capped at 200k) at lumpSumAge
      if (isPensionAccount && ageAtMonth >= lumpSumAgeValue && ageAtMonth < (lumpSumAgeValue + 1)) {
        const lumpSumAmount = Math.min(monthStartBalance * 0.25, 200000);
        monthWithdrawal = lumpSumAmount;
        currentBalance -= monthWithdrawal;
      }
      // Pension regular withdrawal: starts at pensionAge, continues indefinitely
      else if (isPensionAccount && ageAtMonth >= pensionAgeValue) {
        if (useSalaryReplacementForPension) {
          // Use salary replacement approach (continues to grow with January salary increases)
          const hypotheticalSalary = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, januarysSeen) : 0;
          monthWithdrawal = hypotheticalSalary * ((salaryReplacementRate ?? 80) / 100);
        } else {
          // Use withdrawal rate approach (4% rule)
          monthWithdrawal = monthStartBalance * (withdrawalRateValue / 100);
        }
        currentBalance -= monthWithdrawal;
      } 
      // Brokerage: starts in the January following early retirement age, ends when pensionAge is reached
      else if (isBrokerageAccount && month >= earlyRetirementYearStartMonth && ageAtMonth < pensionAgeValue) {
        // Calculate hypothetical salary if user had continued to work
        const hypotheticalSalary = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, januarysSeen) : 0;
        monthWithdrawal = hypotheticalSalary * (salaryReplacementRateValue / 100);
        currentBalance -= monthWithdrawal;
      }
      // House deposit withdrawal from Savings/Brokerage in January following houseWithdrawalAge
      else if (enableHouseWithdrawal && houseWithdrawalAge !== undefined && ageAtMonth >= houseWithdrawalAge && ageAtMonth < (houseWithdrawalAge + 1)) {
        const projectedSalary = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, januarysSeen) : 0;
        const projectedBonus = projectedSalary * ((bonusPercent ?? 0) / 100);
        const totalHouseDeposit = (projectedSalary * 4 + projectedBonus * 2) * ((houseDepositPercent ?? 15) / 100);
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
      
      // Savings/Brokerage: receive lump sum allocation at lumpSumAge (add to contributions) - only in January
      if (!isPensionAccount && ageAtMonth >= lumpSumAgeValue && ageAtMonth < (lumpSumAgeValue + 1) && pensionLumpSumAmount !== undefined && pensionLumpSumAmount > 0) {
        lumpSumContribution = pensionLumpSumAmount;
      }
    }

    // Calculate monthly contribution
    let monthlyContribution = 0;
    if (month < earlyRetirementYearStartMonth) {
      // Contributions stop once the following January after early retirement age is reached
      if (account.isSalaryPercentage && currentSalary && annualSalaryIncrease !== undefined) {
        // For salary-based contributions (e.g., Pension with age brackets)
        let contributionPercentage = account.monthlyContribution;
        if (account.ageBracketContributions) {
          contributionPercentage = getAgeBracketPercentage(ageAtMonth, account.ageBracketContributions);
        }
        
        // Monthly contribution is percentage of monthly salary
        monthlyContribution = (salaryAtMonth / 12) * (contributionPercentage / 100);
        
        // Add employer contribution if present
        if (account.employerContributionPercent !== undefined && account.employerContributionPercent > 0) {
          monthlyContribution += (salaryAtMonth / 12) * (account.employerContributionPercent / 100);
        }
      } else {
        // Fixed monthly contribution
        monthlyContribution = account.monthlyContribution;
      }
      
      // Add bonus contribution from bonus salary (December only)
      const isDecember = monthDate.getMonth() === 11;
      if (isDecember && bonusPercent !== undefined && bonusPercent > 0 && account.bonusContributionPercent !== undefined) {
        const annualBonus = salaryAtMonth * (bonusPercent / 100);
        let bonusContributionPercent = account.bonusContributionPercent;
        
        // Handle pension bonus checkbox: -1 means enabled, use age bracket percentage
        if (account.bonusContributionPercent === -1 && account.ageBracketContributions) {
          bonusContributionPercent = getAgeBracketPercentage(ageAtMonth, account.ageBracketContributions);
        }
        
        // Only add bonus contribution if percentage is positive
        if (bonusContributionPercent > 0) {
          const bonusContribution = annualBonus * (bonusContributionPercent / 100);
          monthlyContribution += bonusContribution;
        }
      }
    }

    // Add lump sum allocation to contributions
    monthlyContribution += lumpSumContribution;

    // Apply interest
    const monthInterest = currentBalance * monthlyRate;
    currentBalance += monthInterest + monthlyContribution;

    // Format month/year as 'FEB 2026'
    const monthLabel = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

    allMonthlyData.push({
      month: month + 1,
      monthYear: monthLabel,
      salary: salaryAtMonth,
      startingBalance: monthStartBalance,
      contribution: monthlyContribution,
      interest: monthInterest,
      withdrawal: monthWithdrawal,
      endingBalance: currentBalance,
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
    const yearWithdrawal = renumberedMonthlyData.reduce((sum, m) => sum + m.withdrawal, 0);
    const yearSalary = renumberedMonthlyData[0]?.salary ?? 0; // Salary at start of year
    
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
  };
}

/**
 * Calculate growth for all accounts in the portfolio
 */
export function calculatePortfolioGrowth(
  accounts: AccountInput[],
  timeHorizon: number,
  currentAge: number,
  currentSalary?: number,
  annualSalaryIncrease?: number,
  monthsUntilNextBirthday?: number,
  dateOfBirth?: Date,
  pensionAge?: number,
  withdrawalRate?: number,
  earlyRetirementAge?: number,
  salaryReplacementRate?: number,
  pensionLumpSumAge?: number,
  lumpSumToBrokerageRate?: number,
  useSalaryReplacementForPension?: boolean,
  bonusPercent?: number,
  houseWithdrawalAge?: number,
  enableHouseWithdrawal?: boolean,
  houseDepositPercent?: number,
  houseDepositFromBrokerageRate?: number
): PortfolioResults {
  const pensionAgeValue = pensionAge ?? 65;
  const earlyRetirementAgeValue = earlyRetirementAge ?? 50;
  const pensionLumpSumAgeValue = pensionLumpSumAge ?? 50;
  const lumpSumToBrokerageRateValue = lumpSumToBrokerageRate ?? 80;

  // First, calculate pension account to determine lump sum amount
  const pensionAccount = accounts.find((a) => a.name === 'Pension');
  let lumpSumAmount = 0;
  if (pensionAccount) {
    const pensionResult = calculateAccountGrowth(
      pensionAccount,
      timeHorizon,
      currentAge,
      currentSalary,
      annualSalaryIncrease,
      monthsUntilNextBirthday,
      dateOfBirth,
      pensionAge,
      withdrawalRate,
      earlyRetirementAge,
      salaryReplacementRate,
      pensionLumpSumAgeValue,
      undefined,
      useSalaryReplacementForPension,
      bonusPercent,
      houseWithdrawalAge,
      enableHouseWithdrawal,
      houseDepositPercent,
      houseDepositFromBrokerageRate
    );
    
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
            lumpSumAmount = Math.min(monthData.startingBalance * 0.25, 200000);
          }
        }
        break;
      }
    }
  }

  // Calculate all accounts with lump sum information
  const accountResults = accounts.map((account) => {
    let lumpSumAllocation = 0;
    
    // Determine lump sum allocation for this account
    if (lumpSumAmount > 0 && account.name !== 'Pension') {
      if (account.name === 'Brokerage') {
        lumpSumAllocation = lumpSumAmount * (lumpSumToBrokerageRateValue / 100);
      } else if (account.name === 'Savings') {
        lumpSumAllocation = lumpSumAmount * ((100 - lumpSumToBrokerageRateValue) / 100);
      }
    }
    
    return calculateAccountGrowth(
      account,
      timeHorizon,
      currentAge,
      currentSalary,
      annualSalaryIncrease,
      monthsUntilNextBirthday,
      dateOfBirth,
      pensionAge,
      withdrawalRate,
      earlyRetirementAge,
      salaryReplacementRate,
      pensionLumpSumAgeValue,
      lumpSumAllocation,
      useSalaryReplacementForPension,
      bonusPercent,
      houseWithdrawalAge,
      enableHouseWithdrawal,
      houseDepositPercent,
      houseDepositFromBrokerageRate
    );
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
  const januariesToEarlyRetirement = startingMonthIsJanuary ? (earlyRetirementAgeValue - currentAge) + 1 : (earlyRetirementAgeValue - currentAge);
  
  const salaryAtTargetAge = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, januariesToTargetAge) : 0;
  const salaryAtEarlyRetirement = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, januariesToEarlyRetirement) : 0;
  const finalSalary = Math.min(salaryAtTargetAge, salaryAtEarlyRetirement);
  
  // Calculate bonus salary at the same milestone
  const bonusSalary = bonusPercent !== undefined && bonusPercent > 0 ? finalSalary * (bonusPercent / 100) : 0;

  return {
    accountResults,
    totalFinalBalance,
    totalContributions,
    totalInterest,
    finalSalary,
    bonusSalary,
    monthsUntilNextBirthday: monthsUntilNextBirthday || 12,
    earlyRetirementAge: earlyRetirementAgeValue,
    pensionAge: pensionAgeValue,
    pensionLumpSumAge: pensionLumpSumAgeValue,
    houseWithdrawalAge,
    enableHouseWithdrawal,
  };
}

/**
 * Combine yearly data across all accounts for charting
 */
export function combineYearlyData(accountResults: AccountResults[]) {
  const timeHorizon = accountResults[0]?.yearlyData.length || 0;
  const combined = [];

  for (let year = 0; year < timeHorizon; year++) {
    const dataPoint: any = { year };

    // Use yearlyData directly since it now starts at year=0
    const age = accountResults[0]?.yearlyData[year]?.age;
    if (age) {
      dataPoint.age = age;
    }
    
    let totalPrincipal = 0;
    let totalEndingBalance = 0;
    
    accountResults.forEach((result) => {
      const accountName = result.accountName;
      const yearData = result.yearlyData[year];
      const endingBalance = yearData?.endingBalance || 0;
      
      dataPoint[accountName] = endingBalance;
      totalEndingBalance += endingBalance;
      
      // Calculate cumulative principal for this account
      // Principal = starting balance at year 0 + sum of all contributions up to this year
      let cumulativePrincipal = result.yearlyData[0]?.startingBalance || 0;
      for (let y = 0; y <= year; y++) {
        cumulativePrincipal += result.yearlyData[y]?.contributions || 0;
      }
      totalPrincipal += cumulativePrincipal;
    });

    // Calculate total
    dataPoint.Total = totalEndingBalance;
    
    // Calculate principal and interest for the total
    dataPoint.Principal = totalPrincipal;
    dataPoint.Interest = Math.max(0, totalEndingBalance - totalPrincipal);

    combined.push(dataPoint);
  }

  return combined;
}
