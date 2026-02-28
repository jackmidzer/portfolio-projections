# App Review and Feature Enhancement Suggestions

---

## Prompt 1: Fix CGT Cost-Basis Tracking

**Goal:** Fix the bug where CGT is applied to the full brokerage withdrawal instead of only the capital gain.

**Context:** `calculateBrokerageCapitalGainsTax` in `taxCalculations.ts:404-417` applies 33% CGT to the entire withdrawal amount. In reality, CGT only applies to the profit portion above the cost basis.

**Steps:**

1. In `types/index.ts`, add a `costBasis` field to `MonthlyBreakdown` (tracks cumulative contributions into brokerage) and a `totalCostBasis` field to `AccountResults`.
2. In `calculateAccountGrowth` (`calculations.ts:107-127`), track a running `costBasis` accumulator. Increment it by contributions each month. When withdrawals occur, compute the gain proportion: `gainRatio = (currentBalance - costBasis) / currentBalance`. Reduce `costBasis` proportionally on withdrawal: `costBasis -= withdrawal * (costBasis / preWithdrawalBalance)`.
3. Refactor `calculateBrokerageCapitalGainsTax` in `taxCalculations.ts:404-417` to accept `withdrawal` and `gainRatio` parameters. Apply 33% only to `withdrawal * gainRatio`.
4. Update all call sites of `calculateBrokerageCapitalGainsTax`: bridging phase withdrawals at `calculations.ts:469-472` and house deposit withdrawal at `calculations.ts:493-497` — pass the computed `gainRatio` from the running cost basis.
5. Store `costBasis` in monthly breakdown data so it's available for debugging/display.

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

## Prompt 5: Refactor calculateAccountGrowth to Use Options Object

**Goal:** Replace the 22 positional parameters of `calculateAccountGrowth` with a single typed options object.

**Context:** The function at `calculations.ts:107-127` has 22 parameters, making it error-prone and hard to maintain. The same applies to `calculatePortfolioGrowth` at `calculations.ts:643-663` with 22 parameters.

**Steps:**

1. In `types/index.ts`, note that `PortfolioInputs` already exists at `index.ts:86` but is unused. Evaluate whether it can serve as the options type for `calculatePortfolioGrowth`, or create a new `AccountGrowthOptions` interface.
2. Define `AccountGrowthOptions` with all 22 parameters as named fields. Make truly optional ones optional with `?`.
3. Refactor `calculateAccountGrowth` signature to `(options: AccountGrowthOptions): AccountResults`.
4. Similarly define `PortfolioGrowthOptions` (or use/extend `PortfolioInputs`) and refactor `calculatePortfolioGrowth`.
5. Update all call sites — primarily the `calculate` method in `useProjectionStore.ts:268-356` and the double pension calculation at `calculations.ts:683-732`.
6. Delete `PortfolioInputs` if it becomes redundant, or consolidate into the new options type.

---

## Prompt 6: Replace `any` Types in ProjectionTable

**Goal:** Replace all `any` type annotations in `ProjectionTable.tsx` with proper types.

**Context:** There are 4 instances of `any` at `ProjectionTable.tsx:226`, `ProjectionTable.tsx:254`, `ProjectionTable.tsx:300`, and `ProjectionTable.tsx:305`. Also one `any` in `combineYearlyData` at `calculations.ts:935`.

**Steps:**

1. Determine the actual shape of the `row` objects passed to `MonthlyDetail` and `computeAnnuals`. These are likely `YearlyBreakdown` from `index.ts:58`.
2. Replace `row: any` at lines 226 and 300 with `row: YearlyBreakdown`.
3. Replace `month: any` at lines 254 and 305 with `month: MonthlyBreakdown`.
4. In `calculations.ts:935`, replace `(m: any)` with the proper `MonthlyBreakdown` type.
5. Fix any resulting type errors — if the row shape doesn't exactly match `YearlyBreakdown`, create an extended type or adjust the existing one.

---

## Prompt 7: Replace Magic Number `-1` for Bonus Contribution

**Goal:** Replace the magic number `-1` used for pension bonus contribution with a type-safe sentinel.

**Context:** The pension account uses `bonusContributionPercent: -1` to mean "use the current age-bracket percentage for bonus contributions". This is fragile and undocumented.

**Steps:**

1. In `types/index.ts`, change the `bonusContributionPercent` field in `AccountInput` from `number` to `number | 'age-bracket'`.
2. In `calculations.ts`, find all checks for `bonusContributionPercent === -1` and replace with `=== 'age-bracket'`.
3. In `useProjectionStore.ts`, update the default value for the pension account's `bonusContributionPercent` from `-1` to `'age-bracket'`.
4. Update any form components that read/write this field (likely in `AccountsSection.tsx`) to handle the union type.

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

## Prompt 10: Add State Persistence with localStorage

**Goal:** Persist user form inputs across page refreshes using Zustand's `persist` middleware.

**Context:** The store is defined in `useProjectionStore.ts`. Zustand v5 is installed. All form inputs live in the `FormInputs` interface at `useProjectionStore.ts:9-42`.

**Steps:**

1. Import `persist` from `zustand/middleware`.
2. Wrap the existing store creator with `persist(...)`.
3. Configure `name: 'portfolio-projections-storage'` for the localStorage key.
4. Use `partialize` to persist only `FormInputs` fields — exclude `UIState` (sidebar state, expanded sections) and `ResultsState` (calculated results) from persistence.
5. Handle the `dateOfBirth` field carefully — `Date` objects don't serialise/deserialise cleanly in JSON. Add a custom `storage` option or use `onRehydrate` to convert the date string back to a `Date` object.
6. Add a version number to the persisted state and a `migrate` function for future schema changes.
7. Consider adding a "Reset to defaults" button in the UI that calls `resetForm()` and clears localStorage.

---

## Prompt 11: Add Vitest and Unit Tests for Calculations

**Goal:** Set up Vitest and create comprehensive unit tests for all financial calculation and tax utilities.

**Steps:**

1. Install dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
2. Add test config to `vite.config.ts` or create a `vitest.config.ts` with `environment: 'jsdom'` and path aliases matching `tsconfig.json`.
3. Add a `"test"` script to `package.json`: `"test": "vitest"` and `"test:ci": "vitest run"`.
4. Create test files:
   - `src/utils/_tests/taxcalculations.test.ts` — Test all 12 exported functions from `taxCalculations.ts`. Key cases: PAYE band boundaries, USC thresholds, PRSI calculation, pension relief cap at €115k, bonus marginal tax, pension withdrawal tax with/without PRSI (age 65/66), CGT at 33%, DIRT at 33%.
   - `src/utils/_tests/calculations.test.ts` — Test `calculateAccountGrowth` for each account type. Key cases: monthly compounding, salary growth timing (January), age-bracket pension contribution changes, pro-rated first year months, `combineYearlyData` aggregation.
   - `src/utils/_tests/houseCalculations.test.ts` — Test house price projection, mortgage calculation, deposit computation, LTV.
   - `src/utils/_tests/formatters.test.ts` — Test `formatCurrency`, `formatPercent`, other formatters.
   - `src/utils/_tests/phaseHelpers.test.ts` — Test phase determination logic.
5. Use snapshot or golden-value tests for full portfolio projections with known inputs.

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

## Prompt 13: Model Irish State Pension

**Goal:** Include the Irish contributory state pension (~€277.30/week as of 2026) in retirement income projections.

**Steps:**

1. Add constants to `irishTaxRates2026.ts`: `STATE_PENSION_WEEKLY = 277.30`, `STATE_PENSION_AGE = 66`, `STATE_PENSION_ANNUAL = 277.30 * 52`.
2. In `useProjectionStore.ts`, add `FormInputs` fields: `includeStatePension: boolean` (default true), `statePensionAge: number` (default 66), `statePensionWeeklyAmount: number` (default 277.30).
3. In `calculations.ts`, when computing drawdown-phase or bridging-phase income for ages >= `statePensionAge`, add the monthly state pension amount (`weeklyAmount * 52 / 12`) to income. This reduces the amount that needs to be withdrawn from the brokerage/pension.
4. The state pension is taxable — include it in the PAYE/USC calculation for the year by passing it to the tax functions.
5. In `types/index.ts`, add `statePensionIncome` to `MonthlyBreakdown` and `CombinedYearData`.
6. Display state pension in the income timeline chart and projection table.
7. Add a form section or fields in `RetirementSection.tsx` for state pension configuration.

---

## Prompt 14: Expose Hidden House Price Inputs

**Goal:** Let users configure `baseHousePrice` and `houseAnnualPriceIncrease` through the UI.

**Context:** These fields exist in the store at `useProjectionStore.ts:124-125` with defaults of €387,000 and 7%, but `HousePurchaseSection.tsx` has no controls for them.

**Steps:**

1. In `HousePurchaseSection.tsx`, add two new `FormField` components (matching the existing pattern in the file):
   - "Estimated house price" — number input bound to `baseHousePrice`, formatted as currency.
   - "Annual price increase %" — number input bound to `houseAnnualPriceIncrease`, with a `%` suffix.
2. Place these fields after the "Enable House Purchase" toggle and before the "Purchase Age" field, only visible when `enableHouseWithdrawal` is true.
3. Add sensible validation: `baseHousePrice > 0`, `houseAnnualPriceIncrease >= 0 && <= 20`.

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

## Prompt 17: Add Auto-Calculate with Debounce

**Goal:** Automatically recalculate projections when form inputs change, with debouncing to avoid excessive computation.

**Context:** Currently the user must click "Calculate" at `useProjectionStore.ts:268`. The `calculate` method runs synchronously.

**Steps:**

1. Create a custom hook `src/hooks/useAutoCalculate.ts`:
   - Subscribe to all `FormInputs` fields from the store using a shallow equality selector.
   - Use a `useEffect` with a `setTimeout` debounce (400ms) that calls `store.calculate()` when inputs change.
   - Clean up the timeout on unmount and on subsequent changes.
2. Mount `useAutoCalculate()` in `DashboardContent.tsx` or `DashboardLayout.tsx`.
3. Keep the "Calculate" button as a manual trigger but make it secondary (or remove it).
4. Add a subtle loading indicator (e.g., a thin progress bar or skeleton pulse on the summary cards) during the debounce delay.
5. If calculation is slow (>100ms), consider wrapping it in `requestIdleCallback` or a Web Worker to avoid blocking the UI thread.

---

## Prompt 18: Add Continuous Form Validation

**Goal:** Show inline validation errors as users type, not only on submit.

**Context:** Validation currently lives inside the `calculate` method at `useProjectionStore.ts:295-314` and only fires on submit.

**Steps:**

1. Create `src/utils/validation.ts` with a `validateInputs(inputs: FormInputs): Record<string, string>` function that returns a map of field name → error message. Extract the existing validation logic from the `calculate` method.
2. In `useProjectionStore.ts`, add `validationErrors: Record<string, string>` to `UIState`. Call `validateInputs` inside `updateField` and `updateAccount` actions to update errors reactively.
3. In `FormField.tsx`, accept an optional `error?: string` prop. Display it as red text below the input with an error icon.
4. In each form section component (`PersonalSection.tsx`, `IncomeSection.tsx`, etc.), read `validationErrors` from the store and pass relevant errors to each `FormField`.
5. Disable the "Calculate" button (or auto-calc) when there are validation errors.
6. Validation rules to include: `dateOfBirth` must be in the past, `targetAge > currentAge`, `fireAge > currentAge`, `pensionAge >= fireAge`, `salaryReplacementRate` between 0–100, account balances >= 0, return rates reasonable (0–30%).

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

---

# Additional Review Items (21–42)

---

## Accessibility (Critical)

**21. Charts are invisible to screen readers** — All four chart components (`PortfolioGrowthChart.tsx`, etc.) render `<canvas>` inside bare `<div>`s with no `role="img"`, `aria-label`, or hidden summary text. Add a visually-hidden table or `aria-label` summarizing the data for each chart.

**22. Icon-only buttons missing accessible names** — Sidebar collapse/expand and mobile menu buttons in `DashboardLayout.tsx:41` lack `aria-label`. Expandable sections in `MilestoneTimeline.tsx:87` and `ProjectionTable.tsx:132` are missing `aria-expanded`. The account-filter `<select>` in `ProjectionTable.tsx:83` has no `<label>`.

**23. No `prefers-reduced-motion` support** — Framer Motion animations and Chart.js's `animation.duration: 600` in `chartConfig.ts:33` never respect the OS reduced-motion setting. Wrap animations in a `useReducedMotion()` check.

---

## Bugs & Edge Cases

**24. `formatCompactCurrency` misformats negatives** — In `formatters.ts:35-47`, `-1500` produces `€-1.5K` instead of `-€1.5K`. The sign gets wedged between the currency symbol and number.

**25. `houseCalculations` doesn't guard `purchaseAge < currentAge`** — In `houseCalculations.ts:26`, `yearsUntilPurchase` goes negative, causing `Math.pow(...)` to return a fraction and the projected house price to shrink.

**26. LTV can exceed 100%** — `houseCalculations.ts:40` doesn't cap `loanToValuePercent`. If the calculated mortgage exceeds the house price, you get > 100% LTV.

**27. No validation that `fireAge <= pensionAge`** — The validation block in `useProjectionStore.ts:295-314` checks both ages individually but never checks their relationship. `fireAge > pensionAge` creates an impossible/overlapping lifecycle.

**28. Tooltip shows wrong pro-rated month count** — `useExternalTooltip.ts:73` displays `getMonthsUntilYearEnd()` (months until Dec 31 *now*) but the projection uses `monthsUntilNextBirthday` (at calculation time). These are different values.

**29. Dead code in ProjectionTable** — `ProjectionTable.tsx:128`: `void isWorkingPhase(row.age, results.fireAge)` calls the function, discards the result, and has no side effects.

---

## Performance

**30. `phaseBandsPlugin` registered 4 times** — `ChartJS.register(phaseBandsPlugin)` appears at module top-level in all four chart components. Should be registered once in `chartConfig.ts`.

**31. Age-range slicing logic duplicated across 4 chart components** — The identical `useMemo` computing `slicedData`/`slicedPhaseBands` is copy-pasted in all four chart files. Extract to a shared `useSlicedChartData` hook.

**32. No table virtualization** — `ProjectionTable.tsx` renders every year row (50+) into the DOM simultaneously. Consider `react-window` or `@tanstack/react-virtual` for long projections.

**33. O(months × accounts) lookup in `computeAnnuals`** — `ProjectionTable.tsx:311-327`: `results.accountResults.find(...)` is called for every month inside a reduce, creating a quadratic lookup. Hoist the result outside the loop.

---

## Dead Code & Unused Dependencies

**34. Store sidebar state is unused** — `useProjectionStore.ts:47-51` defines `sidebarOpen`, `sidebarCollapsed`, `toggleSidebar`, `setSidebarOpen`, `toggleSidebarCollapse` — but `DashboardLayout.tsx:14-15` uses local `useState` for the same state. The store's sidebar actions are entirely dead code.

**35. `@radix-ui/react-select` is installed but unused** — Listed in `package.json:18` but no `Select` component exists in the codebase. The `ProjectionTable` uses a native `<select>` instead.

**36. Unused variable in `IncomeTimelineChart`** — `IncomeTimelineChart.tsx:34`: `const border = getCssColor('--border')` is captured but never referenced.

---

## Security

**37. XSS vector via `innerHTML` in tooltip** — `useExternalTooltip.ts:105`: `el.innerHTML = html` builds HTML from dataset labels. Use DOM APIs or sanitization instead of raw `innerHTML`.

---

## SEO & Branding

**38. Missing meta tags and default favicon** — `index.html` has no `<meta name="description">`, Open Graph, or Twitter Card tags. The favicon is still the Vite default (`vite.svg`).

---

## Mobile

**39. Fixed `h-[380px]` chart height** — All chart components hardcode `380px` height. Too tall on small phones, too short on large monitors. Use responsive sizing or `aspect-ratio`.

**40. Mobile sheet ignores safe areas** — `DashboardLayout.tsx:143`: `h-[calc(100vh-120px)]` doesn't use `dvh` units or `env(safe-area-inset-bottom)`, so content clips behind the home bar on notched iPhones.

---

## Type Safety & Consistency

**41. `Set<string>` in Zustand store will break persistence** — `useProjectionStore.ts:48`: `expandedSections: Set<string>` doesn't serialize to JSON. When Prompt 10 (localStorage persistence) is implemented, this will silently corrupt. Convert to `string[]` or exclude from persistence.

**42. Badge variant derivation duplicated** — The ternary `accountName === 'Savings' ? 'savings' : accountName === 'Pension' ? 'pension' : 'brokerage'` is copy-pasted in both `SummaryCards.tsx:67` and `MilestoneTimeline.tsx:120`. Extract to a `toBadgeVariant(name: AccountType)` utility.
