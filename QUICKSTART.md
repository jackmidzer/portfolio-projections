# Portfolio Projections - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd portfolio-projections
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open in Browser
Open the URL shown in terminal (usually http://localhost:5173)

---

## 📋 What's Included

✅ Complete React 18 + TypeScript setup with Vite
✅ Pre-configured Tailwind CSS with shadcn/ui-style primitives
✅ Chart.js / react-chartjs-2 for data visualisation (4 chart views)
✅ Zustand for state management
✅ Three account types: Savings, Pension, Brokerage
✅ Full Irish tax modelling (PAYE, USC, PRSI, DIRT, CGT, pension relief)
✅ Compound interest calculations with monthly compounding
✅ Early retirement (FIRE) and pension phase planning
✅ FIRE countdown widget (live years/months to target)
✅ Career breaks with configurable salary percentage
✅ Windfall lump sums schedulable at any age
✅ Monte Carlo simulation (Web Worker, configurable runs & volatility)
✅ Scenario comparison — save, load, duplicate, and compare named scenarios
✅ House purchase deposit planning
✅ Animated milestone timeline and filterable event timeline (Framer Motion)
✅ Year-by-year expandable breakdown table with CSV export
✅ URL state sharing via LZ-compressed `?s=` query parameter
✅ Auto-calculate: inputs debounce and recalculate via Web Worker
✅ Form validation with inline error messages
✅ Negative balance warning banner
✅ FAQ guide and financial terms glossary
✅ PRSI contribution card
✅ Error boundary with graceful fallback UI
✅ Responsive sidebar + mobile sheet layout
✅ Dark mode with system preference detection
✅ Vitest unit tests for core utilities

---

## 📁 Key Files to Know

- `src/App.tsx` — Root application component
- `src/main.tsx` — Entry point; hydrates shared URL state on load
- `src/layouts/DashboardLayout.tsx` — Sidebar + main content responsive layout
- `src/store/useProjectionStore.ts` — Zustand store (form state, calculation logic, saved scenarios, results)
- `src/hooks/useAutoCalculate.ts` — Debounced auto-recalculation hook
- `src/components/form/SidebarForm.tsx` — Collapsible sidebar form with all input sections
- `src/components/dashboard/DashboardContent.tsx` — Main results area (charts, table, cards)
- `src/components/dashboard/MonteCarloTab.tsx` — Monte Carlo simulation controls and fan chart
- `src/components/dashboard/ScenarioComparison.tsx` — Save / compare named scenarios
- `src/components/dashboard/EventTimeline.tsx` — Filterable lifecycle event timeline
- `src/components/dashboard/ProjectionChart.tsx` — Tabbed chart container
- `src/components/dashboard/ProjectionTable.tsx` — Year-by-year expandable table
- `src/workers/calculationWorker.ts` — Web Worker for off-main-thread projection calculation
- `src/workers/monteCarloWorker.ts` — Web Worker for Monte Carlo simulation
- `src/utils/calculations.ts` — Portfolio growth and compound interest logic
- `src/utils/taxCalculations.ts` — Irish tax calculation logic
- `src/utils/exportCsv.ts` — CSV and chart image export utilities
- `src/utils/validation.ts` — Form validation rules
- `src/constants/irishTaxRates2026.ts` — Irish tax rates and thresholds (2026)
- `src/constants/glossary.ts` — Financial terms glossary
- `src/types/index.ts` — TypeScript type definitions

---

## 🛠 Available Commands

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start development server                 |
| `npm run build`      | Type-check and build for production      |
| `npm run preview`    | Preview production build                 |
| `npm run lint`       | Run ESLint                               |
| `npm test`           | Run Vitest in watch mode                 |
| `npm run test:ci`    | Run Vitest once (for CI)                 |

---

## 🎯 Features to Try

1. **Run Monte Carlo** — Open the Monte Carlo tab, configure simulation count (default 1,000) and volatility (standard deviation), then click Run. Results display as percentile fan bands.
2. **Compare scenarios** — Save your current inputs as a named scenario, tweak inputs, and view side-by-side comparisons. Toggle visibility per scenario.
3. **Add career breaks or windfalls** — Use the dedicated form sections to model periods of reduced income or lump sum deposits at specific ages.
4. **Share a scenario** — The URL updates with a compressed `?s=` parameter; copy and send it to share your exact scenario with someone else.

---

## 🔧 Customization & Extension

1. **Customise default inputs** — edit initial state in `src/store/useProjectionStore.ts`
2. **Add or modify account types** — extend `AccountType` in `src/types/index.ts`
3. **Adjust tax rates** — update `src/constants/irishTaxRates2026.ts` for future tax law changes
4. **Modify calculations** — see `src/utils/calculations.ts` and `src/utils/taxCalculations.ts` for financial logic
5. **Style changes** — Tailwind classes throughout; edit `tailwind.config.js` for theme customization
6. **Add new form sections** — create a component in `src/components/form/` and wire it into `SidebarForm.tsx`
7. **Write tests** — add Vitest tests alongside existing ones in `src/utils/_tests/`

---

## 🤔 Need Help?

Check the full README.md for:
- Detailed project structure
- How the calculation pipeline works (including Web Workers and auto-calculate)
- Monte Carlo and scenario comparison details
- URL state sharing mechanism
- Irish tax formula examples
- Architecture notes
