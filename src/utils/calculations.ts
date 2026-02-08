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
 * Calculate year-by-year breakdown for a single account with compound interest and monthly contributions
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
  salaryReplacementAmount?: number
): AccountResults {
  const yearlyData: YearlyBreakdown[] = [];
  let currentBalance = account.currentBalance;
  const monthlyRate = account.expectedReturn / 100 / 12;
  const firstYearMonths = monthsUntilNextBirthday || 12;
  const isPensionAccount = account.name === 'Pension';
  const isBrokerageAccount = account.name === 'Brokerage';
  const pensionAgeValue = pensionAge ?? 65;
  const withdrawalRateValue = withdrawalRate ?? 4;
  const earlyRetirementAgeValue = earlyRetirementAge ?? 50;
  const replacementAmount = salaryReplacementAmount ?? 0;

  for (let year = 0; year < timeHorizon; year++) {
    const startingBalance = currentBalance;
    let yearWithdrawal = 0;
    let yearInterest = 0;
    let yearContributions = 0;

    // Calculate withdrawals at the start of the year (before growth)
    // Pension: starts at pensionAge, continues indefinitely
    // Brokerage: starts at earlyRetirementAge, ends when pensionAge is reached
    if (isPensionAccount && currentAge + year >= pensionAgeValue) {
      yearWithdrawal = startingBalance * (withdrawalRateValue / 100);
      currentBalance -= yearWithdrawal;
    } else if (isBrokerageAccount && currentAge + year >= earlyRetirementAgeValue && currentAge + year < pensionAgeValue) {
      yearWithdrawal = replacementAmount;
      currentBalance -= yearWithdrawal;
    }

    // Calculate monthly contribution (may be salary-based for pension with age brackets)
    let monthlyContribution = account.monthlyContribution;
    
    // Stop all contributions once early retirement age is reached
    if (currentAge + year >= earlyRetirementAgeValue) {
      monthlyContribution = 0;
    } else if (account.isSalaryPercentage && currentSalary && annualSalaryIncrease !== undefined) {
      // For Pension with age brackets, use the appropriate bracket percentage
      let contributionPercentage = account.monthlyContribution;
      if (account.ageBracketContributions) {
        const ageAtYear = currentAge + year;
        contributionPercentage = getAgeBracketPercentage(ageAtYear, account.ageBracketContributions);
      }
      
      // Calculate salary at this year
      const salaryAtYear = currentSalary * Math.pow(1 + annualSalaryIncrease / 100, year);
      // Monthly contribution is percentage of monthly salary
      monthlyContribution = (salaryAtYear / 12) * (contributionPercentage / 100);
      
      // Add employer contribution if present (for pension accounts)
      if (account.employerContributionPercent !== undefined && account.employerContributionPercent > 0) {
        const employerMonthlyContribution = (salaryAtYear / 12) * (account.employerContributionPercent / 100);
        monthlyContribution += employerMonthlyContribution;
      }
    }

    // Calculate month by month for accurate compound interest
    // First year may be pro-rated based on months until next birthday
    const monthlyData: MonthlyBreakdown[] = [];
    const monthsInYear = year === 0 ? firstYearMonths : 12;
    
    // Calculate starting month/year for this year
    let monthDate = dateOfBirth ? new Date(dateOfBirth) : new Date();
    if (dateOfBirth) {
      // Set to current date and advance by the actual number of months that have elapsed
      // Year 0 may be pro-rated, so subsequent years start at different months
      const now = new Date();
      monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
      // Calculate cumulative months elapsed before this year
      let monthsElapsed = 0;
      if (year === 0) {
        monthsElapsed = 0; // First year starts at current month
      } else {
        // Add months from year 0 (which may be pro-rated) and all subsequent full years
        monthsElapsed = firstYearMonths + (year - 1) * 12;
      }
      // Advance the month/year by the elapsed months
      for (let i = 0; i < monthsElapsed; i++) {
        monthDate.setMonth(monthDate.getMonth() + 1);
      }
    }
    
    for (let month = 1; month <= monthsInYear; month++) {
      const monthStartBalance = currentBalance;
      const monthInterest = monthStartBalance * monthlyRate;
      yearInterest += monthInterest;
      currentBalance += monthInterest + monthlyContribution;
      
      // Format month/year as 'FEB 2026'
      const monthLabel = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
      
      monthlyData.push({
        month,
        monthYear: monthLabel,
        startingBalance: monthStartBalance,
        contribution: monthlyContribution,
        interest: monthInterest,
        endingBalance: currentBalance,
      });
      
      // Advance to next month
      monthDate.setMonth(monthDate.getMonth() + 1);
    }

    yearContributions = monthlyContribution * monthsInYear;
    const endingBalance = currentBalance;

    yearlyData.push({
      year,
      age: currentAge + year,
      startingBalance,
      contributions: yearContributions,
      interestEarned: yearInterest,
      endingBalance,
      monthlyData,
      withdrawal: yearWithdrawal,
    });
  }

  const totalContributions = yearlyData.reduce((sum, yd) => sum + yd.contributions, 0);
  const totalWithdrawals = yearlyData.reduce((sum, yd) => sum + yd.withdrawal, 0);
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
  salaryReplacementRate?: number
): PortfolioResults {
  const pensionAgeValue = pensionAge ?? 65;
  const earlyRetirementAgeValue = earlyRetirementAge ?? 50;
  // Calculate final salary (stops at early retirement age)
  let finalSalary = currentSalary || 0;
  if (currentSalary && annualSalaryIncrease !== undefined) {
    const earlyRetirementAgeValue = earlyRetirementAge ?? 50;
    const yearsToRetirement = Math.max(0, earlyRetirementAgeValue - currentAge);
    finalSalary = currentSalary * Math.pow(1 + annualSalaryIncrease / 100, yearsToRetirement);
  }

  // Calculate salary replacement amount (fixed withdrawal amount during early retirement)
  const salaryReplacementAmount = finalSalary * ((salaryReplacementRate ?? 80) / 100);

  const accountResults = accounts.map((account) =>
    calculateAccountGrowth(account, timeHorizon, currentAge, currentSalary, annualSalaryIncrease, monthsUntilNextBirthday, dateOfBirth, pensionAge, withdrawalRate, earlyRetirementAge, salaryReplacementAmount)
  );

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

  return {
    accountResults,
    totalFinalBalance,
    totalContributions,
    totalInterest,
    finalSalary,
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
