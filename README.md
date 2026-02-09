# Portfolio Projections

A React-based financial planning tool that calculates compound interest projections across multiple account types (Savings, Pension, and Brokerage).

## Features

- **Multiple Account Types**: Track Savings, Pension, and Brokerage accounts simultaneously
- **Compound Interest Calculations**: Monthly compounding with regular contributions
- **Year-by-Year Breakdown**: Detailed table showing principal, contributions, and interest for each year
- **Interactive Charts**: Visualize portfolio growth with line and area charts
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
│   │   ├── AccountInput.tsx       # Input fields for a single account
│   │   ├── InputForm.tsx          # Main form with all accounts and time horizon
│   │   ├── AccountSummary.tsx     # Summary cards showing totals
│   │   ├── PortfolioChart.tsx     # Interactive chart visualization
│   │   └── ResultsTable.tsx       # Year-by-year breakdown table
│   ├── utils/
│   │   ├── calculations.ts        # Compound interest calculation logic
│   │   └── formatters.ts          # Currency and number formatting
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Application entry point
│   └── index.css                  # Global styles and Tailwind directives
├── index.html                     # HTML template
├── package.json                   # Project dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── postcss.config.js              # PostCSS configuration
```

## How It Works

### Calculation Method

The app uses monthly compounding with the following approach:

1. For each month within a year:
   - Calculate interest on current balance: `interest = balance × (annualRate / 12)`
   - Add interest and monthly contribution to balance
2. Track yearly totals for contributions and interest earned
3. Repeat for the specified time horizon

### Key Formula

For compound interest with regular monthly contributions:

```
Monthly Rate = Annual Rate / 12
For each month:
  Interest = Current Balance × Monthly Rate
  New Balance = Current Balance + Interest + Monthly Contribution
```

## Future Enhancement Ideas

Since this is an MVP, here are some features you might consider adding:

### Data & Calculations
- [ ] Inflation adjustment toggle
- [ ] Tax calculations (pre-tax vs post-tax contributions)
- [ ] Withdrawal scenarios (retirement planning)
- [ ] Variable contribution schedules
- [ ] Multiple portfolios/scenarios side-by-side comparison
- [ ] Goal tracking (e.g., "Save $1M by age 66")

### UI/UX Improvements
- [ ] Dark mode
- [ ] Save/load scenarios from localStorage
- [ ] Export results to PDF or CSV
- [ ] Print-friendly view
- [ ] Tooltips with explanations
- [ ] Mobile-optimized charts

### Data Persistence
- [ ] Add backend (Node.js/Express or Firebase)
- [ ] User authentication
- [ ] Save scenarios to database
- [ ] Historical tracking of actual vs. projected growth

### Advanced Features
- [ ] Import data from CSV or financial institutions
- [ ] Connect to real market data APIs
- [ ] Monte Carlo simulation for risk analysis
- [ ] Asset allocation recommendations

## Architecture Notes for Scaling

The codebase is structured to make future enhancements easier:

1. **Modular calculations**: All financial logic is isolated in `utils/calculations.ts`, making it easy to extend or modify formulas

2. **Type safety**: TypeScript interfaces in `types/index.ts` ensure data consistency across components

3. **Component composition**: Each component has a single responsibility and can be reused or extended independently

4. **API-ready structure**: When adding a backend, you can replace the calculation functions with API calls without changing component structure

5. **State management**: Currently uses React's `useState`, but you can easily add Redux, Zustand, or Context API when needed

## Contributing

This is a starter template. Feel free to customize and extend it for your needs!

## License

MIT License - feel free to use this for personal or commercial projects.
