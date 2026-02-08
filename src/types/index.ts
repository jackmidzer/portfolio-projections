export type AccountType = 'Savings' | 'Pension' | 'Brokerage';

export interface AgeBracketContributions {
  under30: number;       // percentage for ages < 30
  age30to39: number;     // percentage for ages 30-39
  age40to49: number;     // percentage for ages 40-49
  age50to54: number;     // percentage for ages 50-54
  age55to59: number;     // percentage for ages 55-59
  age60plus: number;     // percentage for ages 60+
}

export interface AccountInput {
  name: AccountType;
  currentBalance: number;
  monthlyContribution: number;
  expectedReturn: number; // as percentage (e.g., 7 for 7%)
  isSalaryPercentage?: boolean; // if true, monthlyContribution is treated as % of monthly salary
  ageBracketContributions?: AgeBracketContributions; // for Pension: contribution % by age bracket
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
  currentSalary: number;
  annualSalaryIncrease: number; // as percentage (e.g., 3 for 3%)
}

export interface PortfolioResults {
  accountResults: AccountResults[];
  totalFinalBalance: number;
  totalContributions: number;
  totalInterest: number;
  finalSalary: number; // projected salary at future age
}
