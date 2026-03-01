# App Review and Feature Enhancement Suggestions

---

## Prompt 2: Add CGT Annual Exemption (€1,270)

**Goal:** Apply the Irish €1,270 annual CGT exemption before calculating capital gains tax.

**Context:** The current `calculateBrokerageCapitalGainsTax` at `taxCalculations.ts:404-417` does not deduct any exemption.

**Steps:**

1. In `irishTaxRates2026.ts`, add a constant `CGT_ANNUAL_EXEMPTION = 1270`.
2. In the brokerage withdrawal logic in `calculateAccountGrowth` (`calculations.ts:107`), track a running `cgtExemptionUsed` accumulator that resets each January (when a new calendar year starts).
3. When computing CGT on a withdrawal, first reduce the taxable gain by the remaining annual exemption: `taxableGain = Math.max(0, gain - remainingExemption)`. Update `cgtExemptionUsed` accordingly.
4. Refactor `calculateBrokerageCapitalGainsTax` to accept and return the exemption used, or handle this logic in the calling code in `calculateAccountGrowth`.

---

## Prompt 8: Eliminate Double Pension Calculation

**Goal:** Remove the redundant first pension calculation that exists solely to determine the lump sum amount.

**Context:** At `calculations.ts:683-732`, the pension account is calculated once to determine the lump sum amount, then calculated again in the `accounts.map(...)` loop at `calculations.ts:735`.

**Steps:**

1. Instead of running a full projection to determine the lump sum, compute the projected pension balance at the lump sum age analytically or via a lightweight helper that only tracks the pension balance (no need for full breakdown arrays).
2. Alternatively, restructure the flow: calculate all accounts in a single pass by first computing the pension lump sum amount during the main calculation and distributing it to Savings/Brokerage on-the-fly. This requires changing from independent per-account calculations to a coordinated multi-account calculation.
3. If approach 2 is too complex, create a `estimatePensionBalanceAtAge(account, age, ...)` function that runs a simplified projection (just tracking balance, no breakdown arrays) to determine the lump sum amount, then use that in the full calculation pass.
4. Verify results match the current output before and after refactoring.

---

## Prompt 9: Remove Unused `getMonthsUntilYearEnd`

**Goal:** Delete the unused function from `formatters.ts:49-55`.

**Steps:**

1. Remove the `getMonthsUntilYearEnd` function (lines 49–55) from `formatters.ts`.
2. Verify no imports reference it anywhere (grep for `getMonthsUntilYearEnd`).

---

## Prompt 12: Add Inflation Adjustment Toggle

**Goal:** Add an option to view projections in real (inflation-adjusted) terms alongside nominal values.

**Steps:**

1. In `useProjectionStore.ts`, add fields to `FormInputs`: `inflationRate: number` (default 2.0) and `showRealValues: boolean` (default false).
2. Add UI controls: an inflation rate input in a `PersonalSection.tsx` "Advanced" section, and a toggle switch near the charts.
3. In `calculations.ts`, after computing nominal projections, add a utility function `adjustForInflation(yearlyData: CombinedYearData[], inflationRate: number, startYear: number): CombinedYearData[]` that discounts all monetary values by `(1 + r)^n` where `n` is years from start.
4. In `useChartData.ts`, apply the inflation adjustment to chart data when `showRealValues` is true.
5. In `SummaryCards.tsx` and `ProjectionTable.tsx`, conditionally display real or nominal values.
6. Add a visual indicator (badge or label) when viewing inflation-adjusted values.

---

## Prompt 15: Add Data Export (CSV/PDF)

**Goal:** Allow users to export projection results as CSV or PDF.

**Steps:**

1. CSV Export:
   - Create `src/utils/exportCsv.ts` with a function `exportProjectionToCsv(data: CombinedYearData[])` that converts the year-by-year data into CSV format with columns: Age, Phase, Salary, Savings Balance, Pension Balance, Brokerage Balance, Total Balance, Contributions, Interest, Withdrawals, Net Income.
   - Trigger download using `Blob` + `URL.createObjectURL` + hidden `<a>` click pattern.
2. PDF Export (optional, heavier):
   - Install a lightweight library like `jspdf` + `jspdf-autotable`, or use the browser's `window.print()` with a print-optimised CSS stylesheet.
   - If using `window.print()`, add `@media print` styles to `index.css` that hide the sidebar and format the dashboard for print.
3. In `DashboardContent.tsx`, add export buttons (using Lucide `Download` icon) above the projection table. Wire them to the export functions.
4. Consider also allowing export of just the visible chart as PNG using Chart.js's built-in `toBase64Image()` method.

---

## Prompt 16: Add Scenario Comparison

**Goal:** Allow users to save, name, and compare multiple input scenarios side by side.

**Steps:**

1. Create a new type `Scenario = { id: string; name: string; inputs: FormInputs; results: PortfolioResults | null }` in `types/index.ts`.
2. In `useProjectionStore.ts`, add state: `scenarios: Scenario[]`, `activeScenarioId: string | null`, and actions: `saveScenario(name: string)`, `loadScenario(id: string)`, `deleteScenario(id: string)`, `duplicateScenario(id: string)`.
3. Persist scenarios to localStorage (extend the persistence from Prompt 10).
4. Create `src/components/dashboard/ScenarioComparison.tsx` — a view that renders two scenarios' `SummaryCards` and key metrics side by side with delta indicators (e.g., "+€42,000" in green).
5. Add a scenario management UI: a dropdown or tabs in the header area of `DashboardLayout.tsx` showing saved scenarios with save/load/delete actions.
6. In the comparison view, overlay two portfolio growth lines on the same chart using Chart.js multi-dataset support.

---

## Prompt 19: Add Married/Joint Tax Assessment Option

**Goal:** Support married/jointly assessed tax calculations alongside the existing single filer mode.

**Context:** Tax bands are defined in `irishTaxRates2026.ts`. PAYE bands for married couples have a higher standard rate cut-off (€51,000 vs ~€44,000 for single). Tax credits also differ.

**Steps:**

1. In `irishTaxRates2026.ts`, add married/joint assessment tax bands and credits alongside the existing single-filer values. Create a `getTaxBands(filingStatus: 'single' | 'married-one-income' | 'married-two-income')` function (or extend the existing one).
2. In `useProjectionStore.ts`, add `filingStatus: 'single' | 'married-one-income' | 'married-two-income'` to `FormInputs` (default `'single'`).
3. Optionally add `spouseSalary: number` for two-income married couples (affects the transferable rate band).
4. In `taxCalculations.ts`, pass `filingStatus` through to `calculatePayeTax` and adjust band selection and tax credit amounts accordingly.
5. Add a filing status selector in `PersonalSection.tsx` using a Radix Select component (already installed as `@radix-ui/react-select`).
6. Conditionally show spouse salary input when `married-two-income` is selected.

---

## Prompt 20: Add React Error Boundary

**Goal:** Prevent the entire app from white-screening when a component throws.

**Context:** `App.tsx` is just 7 lines with no error handling. There are no error boundaries anywhere.

**Steps:**

1. Install `react-error-boundary` package (or create a simple class component).
2. Create `src/components/ErrorFallback.tsx` — a styled error UI with:
   - An error message display.
   - A "Try again" button that calls `resetErrorBoundary`.
   - A "Reset form" button that calls `useProjectionStore.getState().resetForm()` and resets.
3. In `App.tsx`, wrap `<DashboardLayout />` with `<ErrorBoundary fallbackComponent={ErrorFallback}>`.
4. Add a second, more granular error boundary around just the chart area in `DashboardContent.tsx` (since Chart.js rendering is the most likely crash point). Its fallback should say "Chart failed to render" with a retry button, while keeping the rest of the dashboard visible.
5. Optionally log errors to the console with additional context (input state at time of crash) for debugging.
