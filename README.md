# Portfolio Projections

A comprehensive Irish financial planning tool built with React and TypeScript. Project your wealth across multiple account types (Savings, Pension, and Brokerage) with sophisticated tax calculations, pension planning, early retirement scenarios, and house purchase planning.

## Features

- **Multiple Account Types**: Track Savings, Pension, and Brokerage accounts with account-specific tax treatments
- **Irish Tax Calculations**: 
  - PAYE, USC, and PRSI income tax calculations
  - DIRT (Deposit Interest Retention Tax) on savings account interest
  - Capital Gains Tax on brokerage withdrawals
  - Pension relief and contributions validation
- **Pension Planning**: Age-bracket based contributions (15-40%), employer contributions, lump sum withdrawals
- **Early Retirement Scenarios**: Plan early retirement with salary replacement rates and portfolio withdrawals
- **Milestone Planning**: Track key financial milestones (pension eligibility, early retirement start, house purchase)
- **House Purchase Planning**: Calculate deposit requirements based on projected house prices and mortgage affordability
- **Monthly Compounding**: Precise monthly interest calculations with regular contributions
- **Year-by-Year Breakdown**: Detailed table showing monthly and yearly progression with tax impacts
- **Interactive Charts**: Visualize portfolio growth with interactive visualizations
- **Dark Mode**: Eye-friendly dark theme for extended use
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

- **React 18** with **TypeScript** for type-safe component development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **Recharts** for interactive data visualization

## Getting Started

### Prerequisites

- Node.js 16+ and npm (or yarn/pnpm)

### Installation

1. Clone or download this repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the URL shown in the terminal (usually `http://localhost:5173`)

### Build for Production

```bash
npm run build
```

The optimized files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
portfolio-projections/
├── src/
│   ├── components/
│   │   ├── AccountInput.tsx          # Input fields for a single account
│   │   ├── AccountSummary.tsx        # Summary cards showing account totals
│   │   ├── HouseDepositSummary.tsx   # House purchase and deposit metrics
│   │   ├── InputForm.tsx             # Main form with all inputs and scenarios
│   │   ├── MilestoneSummary.tsx      # Key financial milestones display
│   │   ├── PortfolioChart.tsx        # Interactive chart visualization
│   │   ├── ResultsTable.tsx          # Year-by-year detailed breakdown table
│   │   └── TaxSummary.tsx            # Irish tax calculations and breakdown
│   ├── context/
│   │   └── DarkModeContext.tsx       # Dark mode theme management
│   ├── constants/
│   │   └── irishTaxRates2026.ts      # Irish tax rates and thresholds
│   ├── utils/
│   │   ├── calculations.ts           # Portfolio growth and compound interest logic
│   │   ├── formatters.ts             # Currency and number formatting utilities
│   │   ├── houseCalculations.ts      # House purchase and deposit calculations
│   │   ├── phaseHelpers.ts           # Financial phase (working, retirement) helpers
│   │   └── taxCalculations.ts        # Irish tax calculation logic (PAYE, USC, PRSI, DIRT, CGT)
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   ├── App.tsx                       # Main application component
│   ├── main.tsx                      # Application entry point
│   └── index.css                     # Global styles and Tailwind directives
├── index.html                        # HTML template
├── package.json                      # Project dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Vite configuration
├── tailwind.config.js                # Tailwind CSS configuration
└── postcss.config.js                 # PostCSS configuration
```

## How It Works

### Core Calculation Pipeline

The app projects your finances month-by-month through three potential phases:

1. **Working Phase**: Earn salary, make contributions to all accounts, accumulate wealth
2. **Early Retirement Phase** (optional): Stop earning salary, withdraw from portfolio to fund living expenses
3. **Pension Phase**: Withdraw from pension, potentially withdraw from brokerage

### Monthly Compounding

For each month, the app:
- Calculates net salary (after PAYE, USC, PRSI taxes and pension contributions)
- Calculates interest on each account: `interest = balance × (annualRate / 12)`
- Applies account-specific taxes (DIRT on savings interest)
- Adds contributions (salary percentage or fixed amounts, including bonuses)
- Updates balances and tracks cumulative totals

### Irish Tax Calculations

**Income Taxes (Working Phase)**:
- PAYE (Pay As You Earn): Progressive tax bands
- USC (Universal Social Charge): Progressive rates up to 8%
- PRSI (Pay Related Social Insurance): Employee and employer contributions

**Investment Taxes**:
- DIRT: 41% tax on savings account interest
- CGT: Capital Gains Tax on brokerage account withdrawals
- Pension Relief: Tax-deductible pension contributions

**Pension Contributions**:
- Age-bracket based: Employee contribution rates scale from 15% (under 30) to 40% (60+)
- Employer contribution: Fixed percentage of salary
- Bonus contributions: Optional percentage of annual bonus

### Pension Lump Sum

At age 50 or later (before pension age), withdraw up to 25% tax-free lump sum, with remainder taxed as income.

### Early Retirement Planning

Define a replacement income target (e.g., 80% of current salary) and the app:
- Withdraws from brokerage and pension accounts to meet the target
- Applies appropriate taxes to withdrawals
- Adjusts portfolio allocations

### House Purchase Planning

Calculate deposit requirements by:
- Projecting house prices with annual appreciation
- Calculating maximum mortgage (4× salary + 2× bonus)
- Determining deposit needed and loan-to-value ratio
- Identifying if deposits can be funded from projected savings

### Key Tax Formula Example

```
Monthly Net Salary = Gross Salary - PAYE - USC - PRSI - Pension Contributions

For Savings Account Interest:
  Gross Interest = Balance × (Annual Rate / 12)
  DIRT Tax = Gross Interest × 0.41
  Net Interest = Gross Interest - DIRT Tax
```

## Using the Application

1. **Input Personal Details**: Date of birth, current age, target age, current salary
2. **Configure Accounts**: Set current balances, expected returns, contribution amounts and rates
3. **Set Financial Goals**: Pension age, early retirement age, house purchase age
4. **Review Results**: 
   - Account summaries showing projected balances
   - Tax breakdown showing PAYE, USC, PRSI, DIRT, CGT
   - Milestone summary with key dates
   - House deposit calculation if enabled
   - Interactive chart and detailed year-by-year table
5. **Export/Share**: Results are calculated in real-time—screenshot or use browser print function

## Architecture & Code Quality

The codebase is structured for maintainability and future enhancements:

1. **Modular calculations**: All financial logic is isolated in `utils/calculations.ts`, making it easy to extend or modify formulas

2. **Type safety**: TypeScript interfaces in `types/index.ts` ensure data consistency across components

3. **Component composition**: Each component has a single responsibility and can be reused or extended independently

4. **Tax localization**: Irish tax logic is concentrated in `utils/taxCalculations.ts` and `constants/irishTaxRates2026.ts` for easy updates when rates change

5. **State management**: Currently uses React's `useState`, but the architecture supports adding Redux, Zustand, or Context API when needed

## Contributing

Feel free to fork, customize, and extend this project for your financial planning needs!

## License

MIT License - feel free to use this for personal or commercial projects.
