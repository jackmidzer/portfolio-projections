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
