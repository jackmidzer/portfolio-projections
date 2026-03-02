# Portfolio Projections

A comprehensive Irish financial planning tool built with React and TypeScript. Project your wealth across multiple account types (Savings, Pension, and Brokerage) with sophisticated tax calculations, pension planning, early retirement scenarios, house purchase planning, Monte Carlo simulations, and scenario comparison.

## Features

- **Multiple Account Types**: Track Savings, Pension, and Brokerage accounts with account-specific tax treatments
- **Irish Tax Calculations**:
  - PAYE, USC, and PRSI income tax calculations
  - DIRT (Deposit Interest Retention Tax) on savings account interest
  - Capital Gains Tax on brokerage withdrawals
  - Pension relief and contributions validation
- **Pension Planning**: Age-bracket based contributions (15–40%), employer contributions, lump sum withdrawals, state pension modelling
- **Early Retirement Scenarios**: Plan early retirement with salary replacement rates and portfolio withdrawals; FIRE countdown widget
- **Career Breaks**: Model periods of reduced or zero income with configurable salary percentage
- **Windfalls**: Schedule one-off lump sum deposits to any account at a specific age
- **Monte Carlo Simulation**: Run thousands of randomised return scenarios to see probability distributions of outcomes
- **Scenario Comparison**: Save, load, duplicate, and visually compare multiple named scenarios side-by-side
- **Event Timeline**: Filterable lifecycle event timeline showing every key financial event across the projection
- **Milestone Timeline**: Animated timeline of key financial milestones (pension eligibility, FIRE age, house purchase)
- **FIRE Countdown**: Live countdown (years and months) to target FIRE age
- **House Purchase Planning**: Calculate deposit requirements based on projected house prices and mortgage affordability
- **Monthly Compounding**: Precise monthly interest calculations with regular contributions
- **Year-by-Year Breakdown**: Detailed expandable table showing monthly and yearly progression with tax impacts
- **CSV Export**: Download the full projection table as a CSV file
- **URL State Sharing**: Share your exact scenario via a compressed URL (`?s=` query parameter)
- **Interactive Charts**: Portfolio growth, contributions vs growth, annual flows, and income timeline charts built with Chart.js — with age-range slider and lifecycle phase bands
- **Summary Cards**: At-a-glance cards for each account showing final balance, total contributions, and total interest/growth
- **PRSI Contribution Card**: Dedicated card surfacing PRSI metrics
- **Tax Breakdown**: Comprehensive tax summary card showing PAYE, USC, PRSI, DIRT, and CGT totals
- **Negative Balance Banner**: Warning banner whenever any account is projected to go negative
- **FAQ & Glossary**: Inline FAQ guide and financial terms glossary
- **Form Validation**: Real-time validation with inline error messages
- **Auto-Calculate**: Inputs automatically trigger a debounced recalculation (400 ms) via a Web Worker
- **Dark Mode**: Eye-friendly dark theme with system preference detection
- **Responsive Design**: Sidebar form with collapsible sections on desktop; bottom-sheet drawer on mobile
- **Framer Motion Animations**: Smooth transitions and entrance animations throughout the UI
- **Error Boundary**: Graceful error fallback UI to prevent full-page crashes

## Tech Stack

- **React 18** with **TypeScript** for type-safe component development
- **Vite** for fast development and optimised builds
- **Tailwind CSS** + **tailwindcss-animate** for utility-first styling and animations
- **Chart.js** / **react-chartjs-2** + **chartjs-plugin-annotation** for interactive data visualisation
- **Zustand** for lightweight, hook-based state management
- **Radix UI** primitives (Collapsible, Dialog, Dropdown Menu, Label, Scroll Area, Select, Separator, Slider, Switch, Tabs, Tooltip)
- **Framer Motion** for declarative animations
- **Lucide React** for icons
- **lz-string** for LZ-based URL-safe state compression (shareable links)
- **class-variance-authority** + **clsx** + **tailwind-merge** for component variant styling
- **Vitest** + **@testing-library/react** for unit and component testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

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

### Run Tests

```bash
npm test          # watch mode
npm run test:ci   # single run (for CI)
```

## Project Structure

```
portfolio-projections/
├── src/
│   ├── App.tsx                            # Root application component
│   ├── main.tsx                           # Application entry point; URL state hydration
│   ├── index.css                          # Global styles and Tailwind directives
│   ├── components/
│   │   ├── ErrorBoundary.tsx              # React error boundary wrapper
│   │   ├── ErrorFallback.tsx              # Fallback UI for unhandled errors
│   │   ├── ThemeToggle.tsx                # Dark / light mode toggle button
│   │   ├── dashboard/
│   │   │   ├── DashboardContent.tsx       # Main results area (charts, table, cards)
│   │   │   ├── EventTimeline.tsx          # Filterable lifecycle event timeline
│   │   │   ├── FAQGuide.tsx               # Inline FAQ and glossary accordion
│   │   │   ├── FIRECountdown.tsx          # Live countdown to FIRE target age
│   │   │   ├── HouseDepositCard.tsx       # House purchase and deposit metrics card
│   │   │   ├── MilestoneTimeline.tsx      # Animated key milestones timeline
│   │   │   ├── MonteCarloTab.tsx          # Monte Carlo simulation controls and results
│   │   │   ├── NegativeBalanceBanner.tsx  # Warning banner for negative projected balances
│   │   │   ├── PRSIContributionCard.tsx   # PRSI metrics summary card
│   │   │   ├── ProjectionChart.tsx        # Tabbed chart container (4 chart views)
│   │   │   ├── ProjectionTable.tsx        # Year-by-year expandable breakdown table
│   │   │   ├── ScenarioComparison.tsx     # Save / compare named scenarios
│   │   │   ├── SummaryCards.tsx           # Per-account summary cards
│   │   │   └── TaxBreakdown.tsx           # Irish tax totals card
│   │   │   └── charts/
│   │   │       ├── AgeRangeSlider.tsx     # Slider to filter chart age range
│   │   │       ├── AnnualFlowsChart.tsx   # Stacked bar chart of annual flows
│   │   │       ├── chartAnnotations.ts    # Helpers for Chart.js annotation config
│   │   │       ├── chartConfig.ts         # Shared Chart.js defaults and registration
│   │   │       ├── chartTheme.ts          # CSS variable-aware colour helpers
│   │   │       ├── ContributionsGrowthChart.tsx # Contributions vs growth area chart
│   │   │       ├── IncomeTimelineChart.tsx # Income sources over time
│   │   │       ├── index.ts               # Re-exports for chart components
│   │   │       ├── MonteCarloChart.tsx    # Percentile fan chart for Monte Carlo results
│   │   │       ├── phaseBandsPlugin.ts    # Custom Chart.js plugin for phase background bands
│   │   │       ├── PortfolioGrowthChart.tsx # Main portfolio balance line chart
│   │   │       ├── useChartData.ts        # Hook to transform projection data for charts
│   │   │       └── useExternalTooltip.ts  # Shared external HTML tooltip logic
│   │   ├── form/
│   │   │   ├── SidebarForm.tsx            # Collapsible sidebar form container
│   │   │   ├── FormField.tsx              # Reusable labelled input wrapper
│   │   │   ├── FormSection.tsx            # Collapsible form section wrapper
│   │   │   ├── AccountsSection.tsx        # Account type balances, returns, contributions
│   │   │   ├── CareerBreaksSection.tsx    # Career break periods with reduced/zero income
│   │   │   ├── HousePurchaseSection.tsx   # House purchase toggle and settings
│   │   │   ├── IncomeSection.tsx          # Salary, bonus, and employer pension inputs
│   │   │   ├── LumpSumSection.tsx         # Pension lump sum configuration
│   │   │   ├── PersonalSection.tsx        # Date of birth, target age inputs
│   │   │   ├── RetirementSection.tsx      # FIRE age, pension age, replacement rate
│   │   │   ├── WindfallSection.tsx        # One-off lump sum deposits to any account
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
│   │   ├── glossary.ts                    # Financial terms glossary entries
│   │   └── irishTaxRates2026.ts           # Irish tax rates and thresholds (2026)
│   ├── hooks/
│   │   ├── useAutoCalculate.ts            # Debounced auto-recalculation on input changes
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
│   ├── utils/
│   │   ├── badgeVariant.ts                # Badge colour variant helpers
│   │   ├── calculations.ts                # Portfolio growth and compound interest logic
│   │   ├── eventHelpers.ts                # Lifecycle event generation for timeline
│   │   ├── exportCsv.ts                   # CSV and chart image export utilities
│   │   ├── formatters.ts                  # Currency and number formatting utilities
│   │   ├── houseCalculations.ts           # House purchase and deposit calculations
│   │   ├── phaseHelpers.ts                # Financial phase (working, FIRE, pension) helpers
│   │   ├── taxCalculations.ts             # Irish tax logic (PAYE, USC, PRSI, DIRT, CGT)
│   │   ├── validation.ts                  # Form validation rules and error messages
│   │   └── _tests/                        # Vitest unit tests for utils
│   │       ├── calculations.test.ts
│   │       ├── formatters.test.ts
│   │       ├── houseCalculations.test.ts
│   │       ├── phaseHelpers.test.ts
│   │       └── taxcalculations.test.ts
│   └── workers/
│       ├── calculationWorker.ts           # Web Worker: off-main-thread portfolio calculation
│       └── monteCarloWorker.ts            # Web Worker: off-main-thread Monte Carlo simulation
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

Calculations run off the main thread inside a **Web Worker** (`calculationWorker.ts`) to keep the UI responsive. Inputs are automatically debounced (400 ms) and recalculated via `useAutoCalculate`.

### Monthly Compounding

For each month, the app:
- Calculates net salary (after PAYE, USC, PRSI taxes and pension contributions)
- Applies any career break salary reduction for that period
- Calculates interest on each account: `interest = balance × (annualRate / 12)`
- Applies account-specific taxes (DIRT on savings interest)
- Adds contributions (salary percentage or fixed amounts, including bonuses)
- Adds any windfall amount scheduled for that age
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

### Monte Carlo Simulation

Run N simulations (configurable, default 1,000) where each year's return is sampled from a normal distribution centred on the expected return with a configurable volatility (standard deviation). Results are presented as percentile fan bands (10th, 25th, 50th, 75th, 90th) on the chart. The simulation runs in a dedicated **Web Worker** (`monteCarloWorker.ts`) to avoid blocking the UI.

### Early Retirement Planning

Define a replacement income target (e.g., 80% of current salary) and the app:
- Withdraws from brokerage and pension accounts to meet the target
- Applies appropriate taxes to withdrawals
- Adjusts portfolio allocations

### Career Breaks

Define one or more career break periods (from age / to age) with a salary percentage (0% = fully unpaid, 50% = half pay). Contributions and income taxes are scaled accordingly during those years.

### Windfalls

Schedule one-off lump sums at any age that are deposited into a chosen account (Savings, Brokerage, or Pension).

### House Purchase Planning

Calculate deposit requirements by:
- Projecting house prices with annual appreciation
- Calculating maximum mortgage (4× salary + 2× bonus)
- Determining deposit needed and loan-to-value ratio
- Identifying if deposits can be funded from projected savings/brokerage

### URL State Sharing

The full form state is LZ-compressed and encoded into a `?s=` URL parameter, allowing you to share an exact scenario with anyone. On load, `main.tsx` detects and hydrates this state automatically, then removes the parameter from the URL.

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
5. **Optional — Career Breaks**: Add any periods with reduced or no income
6. **Optional — Windfalls**: Schedule one-off lump sums into any account
7. **Optional — House Purchase**: Enable house purchase planning with target age, projected price, and mortgage parameters
8. **Calculate & Review**:
   - Summary cards showing projected final balances per account
   - Tax breakdown card with PAYE, USC, PRSI, DIRT, and CGT totals
   - PRSI contribution card
   - FIRE countdown and milestone timeline
   - House deposit card (if enabled)
   - Negative balance warning banner (if applicable)
   - Four interactive charts with age-range slider and phase bands
   - Monte Carlo tab for probabilistic outcome analysis
   - Scenario comparison panel for side-by-side what-if analysis
   - Detailed year-by-year expandable table with CSV export
   - Filterable event timeline
   - FAQ guide and glossary

## Architecture & Code Quality

The codebase is structured for maintainability and future enhancements:

1. **Modular calculations**: All financial logic is isolated in `utils/calculations.ts` and `utils/taxCalculations.ts`, making it easy to extend or modify formulas

2. **Type safety**: TypeScript interfaces in `types/index.ts` ensure data consistency across components

3. **Component composition**: Dashboard components, form sections, and UI primitives each have a single responsibility and can be reused or extended independently

4. **Tax localisation**: Irish tax logic is concentrated in `utils/taxCalculations.ts` and `constants/irishTaxRates2026.ts` for easy updates when rates change

5. **State management**: Zustand store (`store/useProjectionStore.ts`) manages all form inputs, UI state, saved scenarios, and computed results with a single `calculate()` action

6. **Web Workers**: Both the main projection calculation and Monte Carlo simulations run in dedicated Web Workers to keep the UI always responsive

7. **Auto-recalculation**: `useAutoCalculate` debounces all input changes and automatically triggers recalculation without any manual "Calculate" button press

8. **Chart architecture**: Chart.js with react-chartjs-2 wrappers, a shared config/theme layer, a custom phase bands plugin, and a reusable external tooltip hook

9. **Testing**: Vitest unit tests in `utils/_tests/` cover core calculation, tax, formatting, and helper logic

## Contributing

Feel free to fork, customise, and extend this project for your financial planning needs!

## License

MIT License - feel free to use this for personal or commercial projects.
