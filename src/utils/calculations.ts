import { AccountInput, AccountResults, YearlyBreakdown, PortfolioResults, AgeBracketContributions } from '../types';

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
  monthsUntilNextBirthday?: number
): AccountResults {
  const yearlyData: YearlyBreakdown[] = [];
  let currentBalance = account.currentBalance;
  const monthlyRate = account.expectedReturn / 100 / 12;
  const firstYearMonths = monthsUntilNextBirthday || 12;

  for (let year = 0; year < timeHorizon; year++) {
    const startingBalance = currentBalance;
    let yearInterest = 0;
    let yearContributions = 0;

    // Calculate monthly contribution (may be salary-based for pension with age brackets)
    let monthlyContribution = account.monthlyContribution;
    if (account.isSalaryPercentage && currentSalary && annualSalaryIncrease !== undefined) {
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
    const monthsInYear = year === 0 ? firstYearMonths : 12;
    for (let month = 1; month <= monthsInYear; month++) {
      const monthInterest = currentBalance * monthlyRate;
      yearInterest += monthInterest;
      currentBalance += monthInterest + monthlyContribution;
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
    });
  }

  const totalContributions = yearlyData.reduce((sum, yd) => sum + yd.contributions, 0);
  const totalInterest = currentBalance - account.currentBalance - totalContributions;

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
  monthsUntilNextBirthday?: number
): PortfolioResults {
  const accountResults = accounts.map((account) =>
    calculateAccountGrowth(account, timeHorizon, currentAge, currentSalary, annualSalaryIncrease, monthsUntilNextBirthday)
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

  // Calculate final salary
  let finalSalary = currentSalary || 0;
  if (currentSalary && annualSalaryIncrease !== undefined) {
    finalSalary = currentSalary * Math.pow(1 + annualSalaryIncrease / 100, timeHorizon);
  }

  return {
    accountResults,
    totalFinalBalance,
    totalContributions,
    totalInterest,
    finalSalary,
    monthsUntilNextBirthday: monthsUntilNextBirthday || 12,
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
