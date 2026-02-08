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
  employerContributionPercent?: number; // for Pension: employer contribution as % of salary
}

export interface MonthlyBreakdown {
  month: number;
  monthYear: string; // formatted as 'FEB 2026'
  startingBalance: number;
  contribution: number;
  interest: number;
  endingBalance: number;
}

export interface YearlyBreakdown {
  year: number;
  age: number;
  startingBalance: number;
  contributions: number;
  interestEarned: number;
  endingBalance: number;
  monthlyData: MonthlyBreakdown[];
  withdrawal: number; // amount withdrawn from pension at start of year
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
  dateOfBirth: Date;
  currentAge: number;
  targetAge: number;
  currentSalary: number;
  annualSalaryIncrease: number; // as percentage (e.g., 3 for 3%)
  monthsUntilNextBirthday: number; // for pro-rating first year
  pensionAge: number; // age when pension withdrawals can start (default 65)
  withdrawalRate: number; // annual withdrawal percent for pension (default 4)
  earlyRetirementAge: number; // age when early retirement withdrawals can start (default 50)
  salaryReplacementRate: number; // replacement rate for salary during early retirement (default 80)
}

export interface PortfolioResults {
  accountResults: AccountResults[];
  totalFinalBalance: number;
  totalContributions: number;
  totalInterest: number;
  finalSalary: number; // projected salary at future age
  monthsUntilNextBirthday: number; // for identifying pro-rated first year
  earlyRetirementAge: number; // age when early retirement withdrawals begin
  pensionAge: number; // age when pension withdrawals begin
}
