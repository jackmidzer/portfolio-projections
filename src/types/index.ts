export type AccountType = 'Savings' | 'Pension' | 'Brokerage';

/**
 * Phase type for the financial lifecycle
 * - 'working': period of earning salary and making contributions
 * - 'earlyRetirement': period of no salary but portfolio withdrawals (between earlyRetirementAge and pensionAge)
 * - 'pension': period of pension withdrawals (from pensionAge onward)
 */
export type PhaseType = 'working' | 'earlyRetirement' | 'pension';

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
  bonusContributionPercent?: number; // optional: contribution percent from bonus salary
}

export interface MonthlyBreakdown {
  month: number;
  monthYear: string; // formatted as 'FEB 2026'
  salary: number; // salary at this month
  startingBalance: number;
  contribution: number;
  interest: number;
  interestTax?: number; // DIRT tax on interest (for Savings accounts only)
  withdrawal: number; // amount withdrawn (pension or brokerage withdrawal)
  endingBalance: number;
  monthlyNetSalary: number; // net income after taxes and pension contributions
  monthlyTax?: number; // monthly tax paid (PAYE + USC + PRSI)
  withdrawalPhase?: 'lumpSum' | 'earlyRetirement' | 'pensionPhase'; // type of withdrawal if any
  withdrawalTax?: number; // tax paid on withdrawal (CGT for brokerage, income tax for pension)
  withdrawalNetAmount?: number; // net withdrawal amount after tax
}

export interface YearlyBreakdown {
  year: number;
  age: number;
  salary: number; // salary at the start of the year
  startingBalance: number;
  contributions: number;
  interestEarned: number;
  interestTaxPaid?: number; // total DIRT tax paid during the year (for Savings accounts)
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

export interface HouseDepositCalculation {
  projectedHousePrice: number; // house price at purchase age
  projectedSalary: number; // projected annual salary at purchase age
  projectedMortgage: number; // maximum mortgage available (salary*4 + bonus*2)
  depositRequired: number; // deposit needed (house price - mortgage)
  loanToValuePercent: number; // LTV as percentage (mortgage / house price * 100)
}

export interface PortfolioInputs {
  accounts: AccountInput[];
  dateOfBirth: Date;
  currentAge: number;
  targetAge: number;
  currentSalary: number;
  annualSalaryIncrease: number; // as percentage (e.g., 3 for 3%)
  monthsUntilNextBirthday: number; // for pro-rating first year
  bonusPercent: number; // bonus as percentage of salary (e.g., 15 for 15%)
  pensionAge: number; // age when pension withdrawals can start (default 66)
  withdrawalRate: number; // annual withdrawal percent for pension (default 4)
  earlyRetirementAge: number; // age when early retirement withdrawals can start (default 50)
  salaryReplacementRate: number; // replacement rate for salary during early retirement (default 80)
  lumpSumToBrokerageRate: number; // allocation rate of lump sum to brokerage as % (default 80)
  enablePensionLumpSum?: boolean; // whether to enable pension lump sum withdrawal (default true)
  pensionLumpSumAge?: number; // age when pension lump sum can be withdrawn (default 50, minimum 50, maximum pensionAge)
  houseWithdrawalAge?: number; // age to buy house and withdraw funds (default 34)
  enableHouseWithdrawal?: boolean; // whether to enable house withdrawal (default false)
  baseHousePrice?: number; // average house price at current date in EUR (default 387000)
  houseAnnualPriceIncrease?: number; // annual house price increase as % (default 8)
  houseDepositCalculation?: HouseDepositCalculation; // calculated house deposit metrics
  houseDepositFromBrokerageRate?: number; // allocation rate of house deposit from brokerage as % (default 50)
  mortgageExemption?: boolean; // whether to apply mortgage exemption (default true)
  taxInputs?: TaxInputs; // optional Irish tax calculation inputs
  enableTaxCalculation?: boolean; // whether to show tax calculation
}

export interface MilestoneSnapshot {
  age: number; // age at the milestone
  accountBalances: Array<{
    accountName: AccountType;
    finalBalance: number;
    totalContributions: number;
    totalInterest: number;
  }>;
  totalBalance: number;
  totalContributions: number;
  totalInterest: number;
}

export interface PortfolioResults {
  accountResults: AccountResults[];
  totalFinalBalance: number;
  totalContributions: number;
  totalInterest: number;
  finalSalary: number; // projected salary at future age
  bonusSalary: number; // projected bonus salary at future age
  monthsUntilNextBirthday: number; // for identifying pro-rated first year
  earlyRetirementAge: number; // age when early retirement withdrawals begin
  pensionAge: number; // age when pension withdrawals begin
  enablePensionLumpSum?: boolean; // whether pension lump sum withdrawal is enabled
  pensionLumpSumAge?: number; // age when pension lump sum can be withdrawn
  houseWithdrawalAge?: number; // age when house purchase withdrawal occurs
  enableHouseWithdrawal?: boolean; // whether house withdrawal is enabled
  houseDepositCalculation?: HouseDepositCalculation; // calculated house deposit metrics
  mortgageExemption?: boolean; // whether mortgage exemption is applied
  earlyRetirementSnapshot?: MilestoneSnapshot; // portfolio snapshot at early retirement age
  houseWithdrawalAgeSnapshot?: MilestoneSnapshot; // portfolio snapshot at house purchase age
  pensionAgeSnapshot?: MilestoneSnapshot; // portfolio snapshot at pension age
  taxInputs?: TaxInputs; // optional Irish tax calculation inputs
  enableTaxCalculation?: boolean; // whether to show tax calculation
}

// Irish Tax Calculation Types
export interface TaxInputs {
  grossSalary: number; // Annual gross salary in EUR
  pensionContribution: number; // Annual pension contribution in EUR
  bikValue: number; // Benefit in Kind value in EUR
}

export interface TaxCalculationResult {
  grossSalary: number;
  pensionContribution: number;
  bikValue: number;
  taxableIncome: number; // After pension relief
  payeTax: number;
  usc: number; // Universal Social Charge
  prsi: number; // Pay Related Social Insurance
  totalDeductions: number;
  netSalary: number; // Annual net salary
  effectiveTaxRate: number; // Percentage
  monthlyNetSalary: number;
  breakdown: {
    payeTax: number;
    usc: number;
    prsi: number;
    pensionContribution: number;
  };
  // Additional breakdown details
  prsiPercentUsed: number; // PRSI percentage rate
  taxCreditsApplied: {
    personal: number;
    earned: number;
    medicalInsurance: number;
    rentRelief: number;
    total: number;
  };
  payeTaxBands: Array<{
    startThreshold: number;
    threshold: number;
    rate: number;
    incomeInBand: number;
    taxInBand: number;
  }>;
  uscBands: Array<{
    startThreshold: number;
    threshold: number;
    rate: number;
    incomeInBand: number;
    uscInBand: number;
  }>;
}
