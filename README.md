# Portfolio Projections

A comprehensive Irish financial planning tool built with React and TypeScript. Project your wealth across multiple account types (Savings, Pension, and Brokerage) with sophisticated tax calculations, pension planning, early retirement scenarios, and house purchase planning.

## Features

- **Multiple Account Types**: Track Savings, Pension, and Brokerage accounts with account-specific tax treatments
- **Irish Tax Calculations**:
  - PAYE, USC, and PRSI income tax calculations
  - DIRT (Deposit Interest Retention Tax) on savings account interest
  - Capital Gains Tax on brokerage withdrawals
  - Pension relief and contributions validation
- **Pension Planning**: Age-bracket based contributions (15–40%), employer contributions, lump sum withdrawals
- **Early Retirement Scenarios**: Plan early retirement with salary replacement rates and portfolio withdrawals
- **Milestone Timeline**: Animated timeline of key financial milestones (pension eligibility, FIRE age, house purchase)
- **House Purchase Planning**: Calculate deposit requirements based on projected house prices and mortgage affordability
- **Monthly Compounding**: Precise monthly interest calculations with regular contributions
- **Year-by-Year Breakdown**: Detailed expandable table showing monthly and yearly progression with tax impacts
- **Interactive Charts**: Portfolio growth, contributions vs growth, annual flows, and income timeline charts built with Chart.js — with age-range slider and lifecycle phase bands
- **Summary Cards**: At-a-glance cards for each account showing final balance, total contributions, and total interest/growth
- **Tax Breakdown**: Comprehensive tax summary card showing PAYE, USC, PRSI, DIRT, and CGT totals
- **Dark Mode**: Eye-friendly dark theme with system preference detection
- **Responsive Design**: Sidebar form with collapsible sections on desktop; bottom-sheet drawer on mobile
- **Framer Motion Animations**: Smooth transitions and entrance animations throughout the UI

## Tech Stack

- **React 18** with **TypeScript** for type-safe component development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** + **tailwindcss-animate** for utility-first styling and animations
- **Chart.js** / **react-chartjs-2** + **chartjs-plugin-annotation** for interactive data visualisation
- **Zustand** for lightweight, hook-based state management
- **Radix UI** primitives (Collapsible, Dialog, Dropdown Menu, Label, Scroll Area, Select, Separator, Slider, Switch, Tabs, Tooltip)
- **Framer Motion** for declarative animations
- **Lucide React** for icons
- **class-variance-authority** + **clsx** + **tailwind-merge** for component variant styling

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

The optimised files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
portfolio-projections/
├── src/
│   ├── App.tsx                            # Root application component
│   ├── main.tsx                           # Application entry point
│   ├── index.css                          # Global styles and Tailwind directives
│   ├── components/
│   │   ├── ThemeToggle.tsx                # Dark / light mode toggle button
│   │   ├── dashboard/
│   │   │   ├── DashboardContent.tsx       # Main results area (charts, table, cards)
│   │   │   ├── HouseDepositCard.tsx       # House purchase and deposit metrics card
│   │   │   ├── MilestoneTimeline.tsx      # Animated financial milestones timeline
│   │   │   ├── ProjectionChart.tsx        # Tabbed chart container (4 chart views)
│   │   │   ├── ProjectionTable.tsx        # Year-by-year expandable breakdown table
│   │   │   ├── SummaryCards.tsx           # Per-account summary cards
│   │   │   ├── TaxBreakdown.tsx           # Irish tax totals card
│   │   │   └── charts/
│   │   │       ├── AgeRangeSlider.tsx     # Slider to filter chart age range
│   │   │       ├── AnnualFlowsChart.tsx   # Stacked bar chart of annual flows
│   │   │       ├── ContributionsGrowthChart.tsx # Contributions vs growth area chart
│   │   │       ├── IncomeTimelineChart.tsx # Income sources over time
│   │   │       ├── PortfolioGrowthChart.tsx # Main portfolio balance line chart
│   │   │       ├── chartConfig.ts         # Shared Chart.js defaults and registration
│   │   │       ├── chartTheme.ts          # CSS variable-aware colour helpers
│   │   │       ├── index.ts              # Re-exports for chart components
│   │   │       ├── phaseBandsPlugin.ts    # Custom Chart.js plugin for phase background bands
│   │   │       ├── useChartData.ts        # Hook to transform projection data for charts
│   │   │       └── useExternalTooltip.ts  # Shared external HTML tooltip logic
│   │   ├── form/
│   │   │   ├── SidebarForm.tsx            # Collapsible sidebar form container
│   │   │   ├── FormField.tsx              # Reusable labelled input wrapper
│   │   │   ├── FormSection.tsx            # Collapsible form section wrapper
│   │   │   ├── AccountsSection.tsx        # Account type balances, returns, contributions
│   │   │   ├── HousePurchaseSection.tsx   # House purchase toggle and settings
│   │   │   ├── IncomeSection.tsx          # Salary, bonus, and employer pension inputs
│   │   │   ├── LumpSumSection.tsx         # Pension lump sum configuration
│   │   │   ├── PersonalSection.tsx        # Date of birth, target age inputs
│   │   │   ├── RetirementSection.tsx      # FIRE age, pension age, replacement rate
│   │   │   └── WithdrawalSection.tsx      # Withdrawal strategy and priority inputs
│   │   └── ui/                            # Reusable UI primitives (shadcn/ui style)
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── collapsible.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── scroll-area.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       └── tooltip.tsx
│   ├── constants/
│   │   └── irishTaxRates2026.ts           # Irish tax rates and thresholds
│   ├── hooks/
│   │   ├── useDarkMode.ts                 # System-aware dark mode hook
│   │   └── useThemeKey.ts                 # Chart re-render key on theme change
│   ├── layouts/
│   │   └── DashboardLayout.tsx            # Sidebar + main content responsive layout
│   ├── lib/
│   │   └── utils.ts                       # Utility helpers (cn, etc.)
│   ├── store/
│   │   └── useProjectionStore.ts          # Zustand store (form inputs, UI state, results, calculate)
│   ├── types/
│   │   └── index.ts                       # TypeScript type definitions
│   └── utils/
│       ├── calculations.ts                # Portfolio growth and compound interest logic
│       ├── formatters.ts                  # Currency and number formatting utilities
│       ├── houseCalculations.ts           # House purchase and deposit calculations
│       ├── phaseHelpers.ts                # Financial phase (working, FIRE, pension) helpers
│       └── taxCalculations.ts             # Irish tax calculation logic (PAYE, USC, PRSI, DIRT, CGT)
├── index.html                             # HTML template
├── package.json                           # Project dependencies and scripts
├── tsconfig.json                          # TypeScript configuration
├── tsconfig.node.json                     # TypeScript config for Vite/Node tooling
├── vite.config.ts                         # Vite configuration
├── tailwind.config.js                     # Tailwind CSS configuration
└── postcss.config.js                      # PostCSS configuration
```

## How It Works

### Core Calculation Pipeline

The app projects your finances month-by-month through three potential phases:

1. **Working Phase**: Earn salary, make contributions to all accounts, accumulate wealth
2. **Early Retirement (FIRE) Phase** (optional): Stop earning salary, withdraw from brokerage to fund living expenses
3. **Pension Phase**: Access pension (with optional lump sum), potentially continue brokerage withdrawals

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
- DIRT: 33% tax on savings account interest
- CGT: 33% Capital Gains Tax on brokerage account withdrawals
- Pension Relief: Tax-deductible pension contributions

**Pension Contributions**:
- Age-bracket based: Employee contribution rates scale from 15% (under 30) to 40% (60+)
- Employer contribution: Fixed percentage of salary
- Bonus contributions: Optional percentage of annual bonus

### Pension Lump Sum

At pension age, withdraw up to 25% as a lump sum (first €200,000 tax-free), with the remainder transferred to brokerage/savings and drawn down as retirement income.

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
- Identifying if deposits can be funded from projected savings/brokerage

### Key Tax Formula Example

```
Monthly Net Salary = Gross Salary - PAYE - USC - PRSI - Pension Contributions

For Savings Account Interest:
  Gross Interest = Balance × (Annual Rate / 12)
  DIRT Tax = Gross Interest × 0.33
  Net Interest = Gross Interest - DIRT Tax
```

## Using the Application

1. **Input Personal Details**: Date of birth, target projection age
2. **Configure Income**: Current salary, expected raises, annual bonus, employer pension contribution
3. **Configure Accounts**: Set current balances, expected returns, and contribution rates for Savings, Pension, and Brokerage
4. **Set Retirement Goals**: FIRE age, pension access age, salary replacement rate, withdrawal strategy
5. **Optional — House Purchase**: Enable house purchase planning with target age, projected price, and mortgage parameters
6. **Calculate & Review**:
   - Summary cards showing projected final balances per account
   - Tax breakdown card with PAYE, USC, PRSI, DIRT, and CGT totals
   - Milestone timeline with key lifecycle dates
   - House deposit card (if enabled)
   - Four interactive charts with age-range slider and phase bands
   - Detailed year-by-year expandable table

## Architecture & Code Quality

The codebase is structured for maintainability and future enhancements:

1. **Modular calculations**: All financial logic is isolated in `utils/calculations.ts` and `utils/taxCalculations.ts`, making it easy to extend or modify formulas

2. **Type safety**: TypeScript interfaces in `types/index.ts` ensure data consistency across components

3. **Component composition**: Dashboard components, form sections, and UI primitives each have a single responsibility and can be reused or extended independently

4. **Tax localisation**: Irish tax logic is concentrated in `utils/taxCalculations.ts` and `constants/irishTaxRates2026.ts` for easy updates when rates change

5. **State management**: Zustand store (`store/useProjectionStore.ts`) manages all form inputs, UI state, and computed results with a single `calculate()` action

6. **Chart architecture**: Chart.js with react-chartjs-2 wrappers, a shared config/theme layer, a custom phase bands plugin, and a reusable external tooltip hook

## Contributing

Feel free to fork, customise, and extend this project for your financial planning needs!

## License

MIT License - feel free to use this for personal or commercial projects.
