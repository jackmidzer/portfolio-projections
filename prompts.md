# Portfolio Projections — Enhancement Prompts

> **Last verified against codebase: 2026-03-01**
>
> Prompts are grouped by theme and ordered so that items within a group can
> be tackled together. Bug-fixes come first, then accuracy improvements,
> then new features, then UX/performance work.

---

## Group 1 — Bug Fixes

These are small, high-impact fixes that should be done first.

### 1-A. Fix: `useAutoCalculate` Missing State Pension Fields

```
In `src/hooks/useAutoCalculate.ts` (lines 12-36), the `useShallow` selector
is missing three fields that affect calculation results:
`includeStatePension`, `statePensionAge`, and `statePensionWeeklyAmount`.

Changes to these fields are silently ignored until another unrelated field
is edited.

Fix:
- Add `includeStatePension`, `statePensionAge`, and
  `statePensionWeeklyAmount` to the `useShallow` selector at
  line 13 inside `useAutoCalculate.ts`

This is a three-line addition.
```

### 1-B. Fix: Deduplicate Validation Logic

```
Validation logic is duplicated between `src/utils/validation.ts`
(`validateInputs` at line 43, returns `Record<string, string>`) and inline
checks inside the `calculate()` action in
`src/store/useProjectionStore.ts` (lines 310-340). They have diverged.

Refactor:
- In `useProjectionStore.ts`, replace the inline validation checks inside
  `calculate()` (lines 310-340) with a single call to
  `validateInputs(state)` from `src/utils/validation.ts`
- Map the returned `Record<string, string>` into both:
  • the `validationErrors` store field (for inline display)
  • the returned `errors: string[]` array (use `Object.values(errors)`)
- Ensure `ValidatableInputs` in `validation.ts` covers all fields currently
  checked inline in the store — compare both sets and add any missing
- Delete the now-redundant inline validation code from `calculate()`
- Run the existing tests in `src/utils/_tests/` to confirm nothing broke
```

---

## Group 2 — Tax & Financial Accuracy

### 2-A. Add CGT Annual Exemption (€1,270)

```
Apply the Irish €1,270 annual CGT exemption before calculating capital
gains tax. The current `calculateBrokerageCapitalGainsTax` at
`src/utils/taxCalculations.ts` (line 422) applies CGT_RATE (33%) to the
full taxable gain with no annual exemption deduction.

Steps:
1. In `src/constants/irishTaxRates2026.ts`, add a constant
   `CGT_ANNUAL_EXEMPTION = 1270`
2. In the brokerage withdrawal logic in `calculateAccountGrowth`
   (`src/utils/calculations.ts`, line 108), track a running
   `cgtExemptionUsed` accumulator that resets each January (when a new
   calendar year starts)
3. When computing CGT on a withdrawal, first reduce the taxable gain by
   the remaining annual exemption:
   `taxableGain = Math.max(0, gain - remainingExemption)`
   Update `cgtExemptionUsed` accordingly
4. Refactor `calculateBrokerageCapitalGainsTax` to accept and return the
   exemption used, or handle this logic in the calling code in
   `calculateAccountGrowth`
```

### 2-B. Add Married / Joint Tax Assessment Option

```
Support married/jointly assessed tax calculations alongside the existing
single filer mode.

Context: Tax bands are defined in `src/constants/irishTaxRates2026.ts`.
`getTaxBands()` (line 71) currently returns the hard-coded single-filer
`PAYE_TAX_BANDS`. Married couples have a higher standard rate cut-off
(~€51,000 vs €44,000 for single). Tax credits also differ.

Steps:
1. In `irishTaxRates2026.ts`, add married/joint assessment tax bands and
   credits alongside existing single-filer values. Extend `getTaxBands()`
   to accept a `filingStatus: 'single' | 'married-one-income' |
   'married-two-income'` parameter
2. In `src/store/useProjectionStore.ts`, add `filingStatus` to
   `FormInputs` (default `'single'`). Optionally add `spouseSalary` for
   two-income married couples (affects the transferable rate band)
3. In `src/utils/taxCalculations.ts`, pass `filingStatus` through to
   `calculatePayeTaxWithDetails` (line 36) and adjust band selection and
   credit amounts accordingly
4. Add a filing status selector in `src/components/form/PersonalSection.tsx`
5. Conditionally show spouse salary input when `married-two-income` is
   selected
6. Add `filingStatus` (and `spouseSalary` if added) to the `useShallow`
   selector in `src/hooks/useAutoCalculate.ts`
```

---

## Group 3 — Core Calculation Improvements

### 3-A. Eliminate Double Pension Calculation

```
Remove the redundant first pension calculation that exists solely to
determine the lump sum amount.

Context: In `src/utils/calculations.ts`, `calculatePortfolioGrowth`
(line 725) first runs `calculateAccountGrowth` for the pension account
(lines 785-848) solely to determine the lump sum amount, then runs all
accounts (including pension again) in the main loop.

Options (pick one):
1. Create a lightweight `estimatePensionBalanceAtAge(account, age, ...)`
   function that runs a simplified projection (just tracking balance, no
   breakdown arrays) to determine the lump sum amount, then use that in
   the full calculation pass
2. Restructure the flow: calculate all accounts in a single pass by first
   computing the pension lump sum amount during the main calculation and
   distributing it to Savings/Brokerage on-the-fly (requires changing from
   independent per-account calculations to a coordinated multi-account
   calculation)

Verify results match the current output before and after refactoring.
```

### 3-B. Mortgage Repayments Modelling

```
Extend the house purchase feature to model ongoing mortgage repayments.

Files: `src/types/index.ts`, `src/store/useProjectionStore.ts`,
`src/utils/houseCalculations.ts`, `src/utils/calculations.ts`,
`src/components/form/HousePurchaseSection.tsx`,
`src/components/dashboard/HouseDepositCard.tsx`

Requirements:
- Add `mortgageInterestRate` (default 4.0) and `mortgageTerm` (default 30,
  in years) to `FormInputs`
- Expose these as inputs in `HousePurchaseSection.tsx` when
  `enableHouseWithdrawal` is true
- In `houseCalculations.ts`, add a
  `calculateMonthlyMortgagePayment(principal, annualRate, termYears)`
  function using the standard annuity formula:
  `P * [r(1+r)^n] / [(1+r)^n - 1]`
- Store `monthlyMortgagePayment` on `HouseDepositCalculation` in
  `src/types/index.ts`
- In `calculations.ts`, after the house withdrawal age, deduct
  `monthlyMortgagePayment` from the net monthly cash available (i.e.
  reduce the amount available for brokerage/savings contributions) for
  `mortgageTerm * 12` months
- Display the calculated monthly repayment and total interest paid over
  the term in `HouseDepositCard.tsx`
- Add `mortgageInterestRate` and `mortgageTerm` to the `useShallow`
  selector in `useAutoCalculate.ts`
```

### 3-C. Career Break / Part-Time Period

```
Add support for modelling career breaks and part-time periods.

Requirements:
- Add a `careerBreaks: CareerBreak[]` field to `FormInputs` in
  `src/store/useProjectionStore.ts`, where `CareerBreak` is a new type in
  `src/types/index.ts`:
  `{ id: string; fromAge: number; toAge: number; salaryPercent: number }`
  (0 = full break, 50 = half-time)
- Add a `CareerBreaksSection.tsx` form component in
  `src/components/form/` with an "Add break" button that appends a new
  entry, and per-entry inputs for from age, to age, and salary percent —
  with a remove button for each
- Register the new section in `src/components/form/SidebarForm.tsx`
- In `src/utils/calculations.ts`, inside `calculateAccountGrowth`
  (line 108), before computing the monthly salary, check if the current
  age falls within any `CareerBreak` period and scale `currentSalary` by
  `salaryPercent / 100` for those months
- During a career break with `salaryPercent === 0`, set pension and
  salary-linked brokerage contributions to zero
- Update `useAutoCalculate.ts` to include `careerBreaks` in the
  shallow-selected inputs so changes trigger recalculation
- Add validation in `src/utils/validation.ts`: break periods must not
  overlap, `fromAge` must be < `toAge`, and both must be within
  `[currentAge, targetAge]`
```

---

## Group 4 — Advanced Analysis Features

### 4-A. Inflation-Adjusted ("Real") Values Toggle

```
Add an inflation adjustment feature so users can view projections in
present-value terms.

Requirements:
- Add `inflationRate` (default 2.5) to `FormInputs` in
  `src/store/useProjectionStore.ts` and expose it in
  `src/components/form/PersonalSection.tsx` as a labelled number input
- Add `showRealValues` boolean to `UIState` in the store, toggled by a new
  action `toggleRealValues`
- Add a "Real / Nominal" toggle switch in
  `src/components/dashboard/DashboardContent.tsx` near the summary cards
- In `src/utils/formatters.ts`, add a
  `deflate(amount, years, inflationRate)` helper that returns:
  `amount / Math.pow(1 + inflationRate / 100, years)`
- In `SummaryCards.tsx`, `ProjectionTable.tsx`, and all four chart
  components under `src/components/dashboard/charts/`, apply `deflate()`
  to all monetary values when `showRealValues` is true, using
  `age - currentAge` as the `years` argument
- Display "(Real €)" vs "(Nominal €)" in chart axis labels and card
  subtitles to reflect the active mode
- Add `inflationRate` to the `useShallow` selector in
  `useAutoCalculate.ts`
```

### 4-B. Monte Carlo / Sensitivity Analysis

```
Add a Monte Carlo simulation mode to visualise return uncertainty.

Requirements:
- Add `monteCarloEnabled` boolean, `monteCarloSimulations` number
  (default 500), and `returnVolatility` number (default 8, as a
  percentage) to `FormInputs` in `src/store/useProjectionStore.ts`
- Expose these fields in a new "Simulation" subsection within
  `src/components/form/RetirementSection.tsx`
- Add a `runMonteCarloSimulations()` action to the store that runs N
  iterations of `calculatePortfolioGrowth()` from
  `src/utils/calculations.ts`, each time sampling annual returns from a
  normal distribution — mean = `expectedReturn`, std dev =
  `returnVolatility` — using the Box-Muller transform
- Store the results as
  `monteCarloPercentiles: { p10: number[], p50: number[], p90: number[] }`
  indexed by projection year
- In `src/components/dashboard/charts/PortfolioGrowthChart.tsx`, when
  Monte Carlo is enabled, render the P10–P90 range as a semi-transparent
  filled band and the P50 as the main line, replacing the single
  deterministic line
- Run the Monte Carlo simulation asynchronously using
  `requestIdleCallback` after the main `calculate()` completes
- Ideally move the Monte Carlo computation into a Web Worker
  (`src/workers/monteCarloWorker.ts`) to avoid blocking the main thread
```

### 4-C. Scenario Comparison

```
Allow users to save, name, and compare multiple input scenarios side by
side.

Requirements:
- Add a `scenarios` array to the Zustand store in
  `src/store/useProjectionStore.ts`, where each scenario is:
  `{ id: string; label: string; inputs: FormInputs; results:
  PortfolioResults | null }`
- Add actions: `saveScenario(label)`, `loadScenario(id)`,
  `deleteScenario(id)`, `duplicateScenario(id)`
- Persist scenarios to localStorage (extend the existing `persist`
  middleware config at line 391 — add `scenarios` to `partialize`)
- Add a "Save Scenario" button in `src/components/form/SidebarForm.tsx`
  that prompts for a label and calls `saveScenario`
- Add a scenario selector UI component in
  `src/components/dashboard/DashboardContent.tsx` that lists saved
  scenarios and lets the user toggle which ones are visible
- Create `src/components/dashboard/ScenarioComparison.tsx` — render two
  scenarios' `SummaryCards` and key metrics side by side with delta
  indicators (e.g. "+€42,000" in green)
- In `src/components/dashboard/charts/PortfolioGrowthChart.tsx`, overlay
  saved scenario lines as dashed lines with distinct colours — include
  labels in the chart legend
```

---

## Group 5 — UI / UX Improvements

### 5-A. Inline Field-Level Validation Errors

```
Wire up the existing `error` prop on `FormField`/`NumberField` in
`src/components/form/FormField.tsx` (lines 12, 51) to read from the
Zustand store's `validationErrors: Record<string, string>`.

The infrastructure is already in place: both components accept an `error?:
string` prop and render red text with an AlertCircle icon when set. What's
missing is the wiring.

Requirements:
- Update every field rendered via `FormField`/`NumberField` across all form
  section components (`PersonalSection.tsx`, `IncomeSection.tsx`,
  `RetirementSection.tsx`, `WithdrawalSection.tsx`, `LumpSumSection.tsx`,
  `HousePurchaseSection.tsx`) to read
  `useProjectionStore(s => s.validationErrors[fieldKey])` and pass it as
  the `error` prop
- In `src/components/form/SidebarForm.tsx`, remove the `AnimatePresence`
  grouped error list block (lines 45-69) since errors will now appear
  inline at each field
- Apply a `border-destructive` ring to the underlying `Input` component in
  `FormField.tsx` when an error is present
- Validation already runs live via `useAutoCalculate` — inline errors
  should appear and clear reactively

Note: Depends on prompt 1-B (deduplicate validation) landing first, so
that `validationErrors` in the store is populated by `validateInputs()`.
```

### 5-B. Add React Error Boundary

```
Prevent the entire app from white-screening when a component throws.

Context: `src/App.tsx` is 13 lines with no error handling. There are no
error boundaries anywhere in the app.

Steps:
1. Install `react-error-boundary` package (or create a simple class
   component)
2. Create `src/components/ErrorFallback.tsx` — a styled error UI with:
   - An error message display
   - A "Try again" button that calls `resetErrorBoundary`
   - A "Reset form" button that calls
     `useProjectionStore.getState().resetForm()` and resets
3. In `App.tsx`, wrap `<DashboardLayout />` with
   `<ErrorBoundary fallbackComponent={ErrorFallback}>`
4. Add a second, more granular error boundary around just the chart area
   in `src/components/dashboard/DashboardContent.tsx` (since Chart.js
   rendering is the most likely crash point) — its fallback should say
   "Chart failed to render" with a retry button while keeping the rest of
   the dashboard visible
5. Optionally log errors to the console with additional context (input
   state at time of crash) for debugging
```

---

## Group 6 — Export & Sharing

### 6-A. PDF / CSV Export

```
Add export functionality for the projection results.

Requirements:
- Add an "Export" dropdown button in
  `src/components/dashboard/DashboardContent.tsx` with two options:
  "Download CSV" and "Download PDF Report"
- CSV export:
  • Create `src/utils/exportCsv.ts` — flatten
    `results.accountResults[].yearlyData` into rows with columns: Year,
    Age, Account, Starting Balance, Contributions, Interest Earned,
    Withdrawals, Ending Balance, Net Salary
  • Trigger download using `Blob` + `URL.createObjectURL` + hidden `<a>`
    click pattern — no external library needed
- PDF export:
  • Install `@react-pdf/renderer` and create
    `src/components/export/ProjectionReport.tsx` that renders: cover
    section with key summary stats, the tax breakdown, milestone timeline
    dates, and the full year-by-year table
  • Alternatively use `window.print()` with `@media print` styles in
    `src/index.css` that hide the sidebar and format the dashboard for
    print
- Consider also allowing export of just the visible chart as PNG using
  Chart.js's built-in `toBase64Image()` method
- Both file exports should use the filename format
  `portfolio-projection-YYYY-MM-DD.csv` / `.pdf`
```

### 6-B. Share via URL

```
Add URL-based state sharing so users can share their projection setup.

Context: The store already uses Zustand `persist` middleware with
localStorage (key `'portfolio-projections-storage'` at line 391 in
`src/store/useProjectionStore.ts`). This prompt adds URL sharing on top
of the existing persistence.

Requirements:
- Install `lz-string` (`npm install lz-string`)
- Add a "Share" button in `src/layouts/DashboardLayout.tsx` that:
  • Serialises the current `FormInputs` to JSON
  • Compresses with LZ-string and base64url-encodes it
  • Writes it as a `?s=...` query parameter and copies the full URL to
    the clipboard
- On app load in `src/main.tsx`, check for a `?s=` query param; if
  present, decode, decompress, and parse it, then hydrate the Zustand
  store with those inputs (overriding localStorage)
- Show a toast notification confirming when a link has been copied or when
  state has been loaded from a shared URL
```

---

## Group 7 — Performance

### 7-A. Web Worker for Calculations

```
Move the `calculatePortfolioGrowth()` call off the main thread to keep
the UI responsive during heavy projections.

Requirements:
- Create `src/workers/calculationWorker.ts` — it should listen for a
  message containing a `PortfolioGrowthOptions` object, call
  `calculatePortfolioGrowth()` from `src/utils/calculations.ts`, and post
  the result back
- Configure Vite to bundle the worker via:
  `new Worker(new URL('../workers/calculationWorker.ts', import.meta.url),
  { type: 'module' })`
  No additional Vite plugins needed
- In `src/store/useProjectionStore.ts`, create a singleton worker instance
  and replace the direct `calculatePortfolioGrowth()` call in `calculate()`
  (line 349) with a `postMessage` / `onmessage` round-trip
- The store's `isCalculating` flag should be set to `true` before posting
  and `false` when the worker responds
- Handle worker errors gracefully — surface the error in the existing
  validation error display
- The store's `calculate()` should return a Promise so callers can await
  it; update `useAutoCalculate.ts` accordingly
```