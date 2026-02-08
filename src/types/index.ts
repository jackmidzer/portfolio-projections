export type AccountType = 'Savings' | 'Pension' | 'Brokerage';

export interface AccountInput {
  name: AccountType;
  currentBalance: number;
  monthlyContribution: number;
  expectedReturn: number; // as percentage (e.g., 7 for 7%)
}

export interface YearlyBreakdown {
  year: number;
  age: number;
  startingBalance: number;
  contributions: number;
  interestEarned: number;
  endingBalance: number;
}

export interface AccountResults {
  accountName: AccountType;
  yearlyData: YearlyBreakdown[];
  totalContributions: number;
  totalInterest: number;
  finalBalance: number;
}

export interface PortfolioInputs {
  accounts: AccountInput[];
  currentAge: number;
  futureAge: number;
}

export interface PortfolioResults {
  accountResults: AccountResults[];
  totalFinalBalance: number;
  totalContributions: number;
  totalInterest: number;
}
