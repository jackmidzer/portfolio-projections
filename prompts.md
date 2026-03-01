# Portfolio Projections — Enhancement Prompts

> **Last verified against codebase: 2026-03-01**
>
> Prompts are grouped by theme and ordered so that items within a group can
> be tackled together.

---

## Group 1 — Tax & Financial Accuracy

### 1-A. Add CGT Annual Exemption (€1,270)

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

### 1-B. Add Married / Joint Tax Assessment Option

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

## Group 2 — Core Calculation Improvements

### 2-A. Mortgage Repayments Modelling

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

### 2-B. Career Break / Part-Time Period

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

## Group 3 — Advanced Analysis Features

### 3-A. Inflation-Adjusted ("Real") Values Toggle

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

### 3-B. Monte Carlo / Sensitivity Analysis

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

### 3-C. Scenario Comparison

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