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
  annualSalaryIncrease?: number
): AccountResults {
  const yearlyData: YearlyBreakdown[] = [];
  let currentBalance = account.currentBalance;
  const monthlyRate = account.expectedReturn / 100 / 12;

  for (let year = 1; year <= timeHorizon; year++) {
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
    }

    // Calculate month by month for accurate compound interest
    for (let month = 1; month <= 12; month++) {
      const monthInterest = currentBalance * monthlyRate;
      yearInterest += monthInterest;
      currentBalance += monthInterest + monthlyContribution;
    }

    yearContributions = monthlyContribution * 12;
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
  annualSalaryIncrease?: number
): PortfolioResults {
  const accountResults = accounts.map((account) =>
    calculateAccountGrowth(account, timeHorizon, currentAge, currentSalary, annualSalaryIncrease)
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
  };
}

/**
 * Combine yearly data across all accounts for charting
 */
export function combineYearlyData(accountResults: AccountResults[]) {
  const timeHorizon = accountResults[0]?.yearlyData.length || 0;
  const combined = [];

  for (let year = 0; year <= timeHorizon; year++) {
    const dataPoint: any = { year };

    if (year === 0) {
      // Starting year with initial balances
      const age = accountResults[0]?.yearlyData[0]?.age;
      if (age) {
        dataPoint.age = age - 1; // Age at beginning of projection
      }
      accountResults.forEach((result) => {
        const accountName = result.accountName;
        dataPoint[accountName] = result.yearlyData[0]?.startingBalance || 0;
      });
    } else {
      // Subsequent years with ending balances
      const age = accountResults[0]?.yearlyData[year - 1]?.age;
      if (age) {
        dataPoint.age = age;
      }
      accountResults.forEach((result) => {
        const accountName = result.accountName;
        dataPoint[accountName] = result.yearlyData[year - 1]?.endingBalance || 0;
      });
    }

    // Calculate total
    dataPoint.Total = Object.keys(dataPoint)
      .filter((key) => !['year', 'age'].includes(key))
      .reduce((sum, key) => sum + dataPoint[key], 0);

    combined.push(dataPoint);
  }

  return combined;
}
