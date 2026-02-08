import { AccountInput, AccountResults, YearlyBreakdown, PortfolioResults } from '../types';

/**
 * Calculate year-by-year breakdown for a single account with compound interest and monthly contributions
 */
export function calculateAccountGrowth(
  account: AccountInput,
  timeHorizon: number,
  currentAge: number
): AccountResults {
  const yearlyData: YearlyBreakdown[] = [];
  let currentBalance = account.currentBalance;
  const monthlyRate = account.expectedReturn / 100 / 12;
  const annualContributions = account.monthlyContribution * 12;

  for (let year = 1; year <= timeHorizon; year++) {
    const startingBalance = currentBalance;
    let yearInterest = 0;

    // Calculate month by month for accurate compound interest
    for (let month = 1; month <= 12; month++) {
      const monthInterest = currentBalance * monthlyRate;
      yearInterest += monthInterest;
      currentBalance += monthInterest + account.monthlyContribution;
    }

    const endingBalance = currentBalance;

    yearlyData.push({
      year,
      age: currentAge + year,
      startingBalance,
      contributions: annualContributions,
      interestEarned: yearInterest,
      endingBalance,
    });
  }

  const totalContributions = annualContributions * timeHorizon;
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
  currentAge: number
): PortfolioResults {
  const accountResults = accounts.map((account) =>
    calculateAccountGrowth(account, timeHorizon, currentAge)
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
