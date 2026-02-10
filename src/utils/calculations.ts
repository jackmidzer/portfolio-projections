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
  bonusPercent?: number
): AccountResults {
  const monthlyRate = account.expectedReturn / 100 / 12;
  const firstYearMonths = monthsUntilNextBirthday || 12;
  const totalMonths = firstYearMonths + (timeHorizon - 1) * 12;
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

  // Main monthly loop - iterate through all months in the time horizon
  for (let month = 0; month < totalMonths; month++) {
    // Determine which year and month-within-year we're at
    let currentYear = 0;
    let monthIndexInYear = month;
    if (month >= firstYearMonths) {
      currentYear = 1 + Math.floor((month - firstYearMonths) / 12);
      monthIndexInYear = month - (firstYearMonths + (currentYear - 1) * 12);
    }
    const isFirstMonthOfYear = monthIndexInYear === 0;
    
    // Calculate current age based on number of full birthdays passed
    // Birthdays occur every 12 months starting after the pro-rated first year
    const birthdays = month >= firstYearMonths ? 1 + Math.floor((month - firstYearMonths) / 12) : 0;
    const ageAtMonth = currentAge + birthdays;
    
    // Calculate salary at this point - it increases annually on the birthday/anniversary
    let salaryAtMonth = currentSalary || 0;
    if (currentSalary && annualSalaryIncrease !== undefined) {
      // Salary increases at each birthday (every 12 months, starting after the initial monthsUntilNextBirthday)
      const yearsOfSalaryGrowth = month >= firstYearMonths ? 1 + Math.floor((month - firstYearMonths) / 12) : 0;
      salaryAtMonth = currentSalary * Math.pow(1 + annualSalaryIncrease / 100, yearsOfSalaryGrowth);
    }

    // Determine if we should apply withdrawals (only in the first month of each year, before interest and contributions)
    let monthWithdrawal = 0;
    let lumpSumContribution = 0;
    const monthStartBalance = currentBalance;
    const lumpSumAgeValue = pensionLumpSumAge ?? 50;
    
    if (isFirstMonthOfYear) {
      // Pension lump sum: withdraw 25% of balance (capped at 200k) at lumpSumAge
      if (isPensionAccount && ageAtMonth >= lumpSumAgeValue && ageAtMonth < (lumpSumAgeValue + 1)) {
        const lumpSumAmount = Math.min(monthStartBalance * 0.25, 200000);
        monthWithdrawal = lumpSumAmount;
        currentBalance -= monthWithdrawal;
      }
      // Pension regular withdrawal: starts at pensionAge, continues indefinitely
      else if (isPensionAccount && ageAtMonth >= pensionAgeValue) {
        if (useSalaryReplacementForPension) {
          // Use salary replacement approach (continues to grow with salary increases)
          const yearsOfContinuedWork = ageAtMonth - currentAge;
          const hypotheticalSalary = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, yearsOfContinuedWork) : 0;
          monthWithdrawal = hypotheticalSalary * ((salaryReplacementRate ?? 80) / 100);
        } else {
          // Use withdrawal rate approach (4% rule)
          monthWithdrawal = monthStartBalance * (withdrawalRateValue / 100);
        }
        currentBalance -= monthWithdrawal;
      } 
      // Brokerage: starts at earlyRetirementAge, ends when pensionAge is reached
      else if (isBrokerageAccount && ageAtMonth >= earlyRetirementAgeValue && ageAtMonth < pensionAgeValue) {
        // Calculate hypothetical salary if user had continued to work
        const yearsOfContinuedWork = ageAtMonth - currentAge;
        const hypotheticalSalary = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, yearsOfContinuedWork) : 0;
        monthWithdrawal = hypotheticalSalary * (salaryReplacementRateValue / 100);
        currentBalance -= monthWithdrawal;
      }
      
      // Savings/Brokerage: receive lump sum allocation at lumpSumAge (add to contributions) - only in the year of withdrawal
      if (!isPensionAccount && ageAtMonth >= lumpSumAgeValue && ageAtMonth < (lumpSumAgeValue + 1) && pensionLumpSumAmount !== undefined && pensionLumpSumAmount > 0) {
        lumpSumContribution = pensionLumpSumAmount;
      }
    }

    // Calculate monthly contribution
    let monthlyContribution = 0;
    if (ageAtMonth < earlyRetirementAgeValue) {
      // Contributions stop once early retirement age is reached
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
      const isDecember = monthIndexInYear === 11;
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

  // Now aggregate monthly data into yearly breakdowns
  const yearlyData: YearlyBreakdown[] = [];
  let monthIndex = 0;

  for (let year = 0; year < timeHorizon; year++) {
    const monthsInThisYear = year === 0 ? firstYearMonths : 12;
    const yearStartMonthIndex = monthIndex;
    const yearEndMonthIndex = monthIndex + monthsInThisYear;
    
    // Get monthly data for this year and renumber months to be 1-indexed within the year
    const yearMonthlyData = allMonthlyData.slice(yearStartMonthIndex, yearEndMonthIndex).map((m, index) => ({
      ...m,
      month: index + 1, // Reset month numbering to 1 for each year
    }));
    
    // Aggregate metrics for this year
    const yearStartingBalance = yearMonthlyData[0]?.startingBalance ?? 0;
    const yearEndingBalance = yearMonthlyData[monthsInThisYear - 1]?.endingBalance ?? currentBalance;
    const yearContributions = yearMonthlyData.reduce((sum, m) => sum + m.contribution, 0);
    const yearInterest = yearMonthlyData.reduce((sum, m) => sum + m.interest, 0);
    const yearWithdrawal = yearMonthlyData.reduce((sum, m) => sum + m.withdrawal, 0);
    const yearSalary = yearMonthlyData[0]?.salary ?? 0; // Salary at start of year
    
    // Calculate age at the start of this year using the same logic as the monthly loop
    const birthdays = yearStartMonthIndex >= firstYearMonths 
      ? 1 + Math.floor((yearStartMonthIndex - firstYearMonths) / 12) 
      : 0;
    const yearAge = currentAge + birthdays;

    yearlyData.push({
      year,
      age: yearAge,
      salary: yearSalary,
      startingBalance: yearStartingBalance,
      contributions: yearContributions,
      interestEarned: yearInterest,
      endingBalance: yearEndingBalance,
      monthlyData: yearMonthlyData,
      withdrawal: yearWithdrawal,
    });

    monthIndex = yearEndMonthIndex;
  }

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
  bonusPercent?: number
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
      bonusPercent
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
      bonusPercent
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
  const salaryAtTargetAge = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, timeHorizon) : 0;
  const salaryAtEarlyRetirement = currentSalary ? currentSalary * Math.pow(1 + (annualSalaryIncrease || 0) / 100, earlyRetirementAgeValue - currentAge) : 0;
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
    accountResults.forEach((result) => {
      const accountName = result.accountName;
      dataPoint[accountName] = result.yearlyData[year]?.endingBalance || 0;
    });

    // Calculate total
    dataPoint.Total = Object.keys(dataPoint)
      .filter((key) => !['year', 'age'].includes(key))
      .reduce((sum, key) => sum + dataPoint[key], 0);

    combined.push(dataPoint);
  }

  return combined;
}
