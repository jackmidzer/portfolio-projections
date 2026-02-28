export type AccountType = 'Savings' | 'Pension' | 'Brokerage';

/**
 * Phase type for the financial lifecycle
 * - 'working': working phase - earning salary and making contributions
 * - 'bridging': bridging phase between FIRE age and pension drawdown age
 * - 'drawdown': drawdown phase with pension withdrawals
 */
export type PhaseType = 'working' | 'bridging' | 'drawdown';

export interface AgeBracketContributions {
  under30: number;       // percentage for ages < 30
  age30to39: number;     // percentage for ages 30-39
  age40to49: number;     // percentage for ages 40-49
  age50to54: number;     // percentage for ages 50-54
  age55to59: number;     // percentage for ages 55-59
  age60plus: number;     // percentage for ages 60+
}

export interface EmployerAgeBracketContributions {
  under25: number;       // percentage for ages < 25
  age25to29: number;     // percentage for ages 25-29
  age30to34: number;     // percentage for ages 30-34
  age35to39: number;     // percentage for ages 35-39
  age40to44: number;     // percentage for ages 40-44
  age45to49: number;     // percentage for ages 45-49
  age50to54: number;     // percentage for ages 50-54
  age55plus: number;     // percentage for ages 55+
}

export interface AccountInput {
  name: AccountType;
  currentBalance: number;
  monthlyContribution: number;
  expectedReturn: number; // as percentage (e.g., 7 for 7%)
  isSalaryPercentage?: boolean; // if true, monthlyContribution is treated as % of monthly salary
  ageBracketContributions?: AgeBracketContributions; // for Pension: contribution % by age bracket
  employerAgeBracketContributions?: EmployerAgeBracketContributions; // for Pension: employer contribution % by age bracket
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
  withdrawalPhase?: 'lumpSum' | 'bridging' | 'drawdown'; // type of withdrawal if any
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

/** Options object for calculateAccountGrowth */
export interface AccountGrowthOptions {
  account: AccountInput;
  timeHorizon: number;
  currentAge: number;
  currentSalary?: number;
  annualSalaryIncrease?: number;
  monthsUntilNextBirthday?: number;
  dateOfBirth?: Date;
  pensionAge?: number;
  withdrawalRate?: number;
  fireAge?: number;
  salaryReplacementRate?: number;
  /** Lump-sum allocation deposited into this account (e.g. pension lump-sum share) */
  pensionLumpSumAmount?: number;
  bonusPercent?: number;
  houseWithdrawalAge?: number;
  enableHouseWithdrawal?: boolean;
  houseDepositCalculation?: HouseDepositCalculation;
  houseDepositFromBrokerageRate?: number;
  enablePensionLumpSum?: boolean;
  taxInputs?: TaxInputs;
  pensionAgeBracketContributions?: AgeBracketContributions;
  netBonusValue?: number;
  pensionLumpSumAge?: number;
  pensionLumpSumMaxAmount?: number;
}

/** Options object for calculatePortfolioGrowth */
export interface PortfolioGrowthOptions {
  accounts: AccountInput[];
  timeHorizon: number;
  currentAge: number;
  currentSalary?: number;
  annualSalaryIncrease?: number;
  monthsUntilNextBirthday?: number;
  dateOfBirth?: Date;
  pensionAge?: number;
  withdrawalRate?: number;
  fireAge?: number;
  salaryReplacementRate?: number;
  lumpSumToBrokerageRate?: number;
  bonusPercent?: number;
  houseWithdrawalAge?: number;
  enableHouseWithdrawal?: boolean;
  houseDepositCalculation?: HouseDepositCalculation;
  houseDepositFromBrokerageRate?: number;
  enablePensionLumpSum?: boolean;
  taxInputs?: TaxInputs;
  pensionLumpSumAge?: number;
  mortgageExemption?: boolean;
  pensionLumpSumMaxAmount?: number;
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

export interface PensionLumpSumTaxBreakdown {
  grossLumpSum: number;
  taxFreeAmount: number;
  standardRateAmount: number;
  standardRateTax: number;
  marginalAmount: number;
  marginalTax: number;
  totalTax: number;
  netLumpSum: number;
}

export interface PortfolioResults {
  accountResults: AccountResults[];
  totalFinalBalance: number;
  totalContributions: number;
  totalInterest: number;
  finalSalary: number; // projected salary at future age
  bonusSalary: number; // projected bonus salary at future age
  monthsUntilNextBirthday: number; // for identifying pro-rated first year
  fireAge: number; // age when FIRE begins
  pensionAge: number; // age when pension drawdown begins
  enablePensionLumpSum?: boolean; // whether pension lump sum withdrawal is enabled
  pensionLumpSumAge?: number; // age when pension lump sum can be withdrawn
  houseWithdrawalAge?: number; // age when house purchase withdrawal occurs
  enableHouseWithdrawal?: boolean; // whether house withdrawal is enabled
  houseDepositCalculation?: HouseDepositCalculation; // calculated house deposit metrics
  mortgageExemption?: boolean; // whether mortgage exemption is applied
  fireSnapshot?: MilestoneSnapshot; // portfolio snapshot at FIRE age
  houseWithdrawalAgeSnapshot?: MilestoneSnapshot; // portfolio snapshot at house purchase age
  pensionDrawdownSnapshot?: MilestoneSnapshot; // portfolio snapshot at pension drawdown age
  taxInputs?: TaxInputs; // optional Irish tax calculation inputs
  enableTaxCalculation?: boolean; // whether to show tax calculation
  lumpSumTaxBreakdown?: PensionLumpSumTaxBreakdown; // pension lump sum tax breakdown
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
