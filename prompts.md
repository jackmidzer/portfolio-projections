# Portfolio Projections — Enhancement Prompts

> **Last verified against codebase: 2026-03-01**
>
> Prompts are grouped by theme and ordered so that items within a group can
> be tackled together.

---

## Group 1 — Advanced Analysis Features

### 1-A. Monte Carlo / Sensitivity Analysis

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

---

🧮 New Calculation Features

Withdrawal Order Priority
During the bridging phase, the app withdraws exclusively from brokerage. But some users may prefer to draw down savings first (to avoid DIRT), or draw proportionally from multiple accounts. Adding a drag-to-reorder withdrawal priority list in WithdrawalSection.tsx (Savings → Brokerage → Pension, or any order) and respecting it in calculations.ts would give users meaningful control over their drawdown strategy and its tax implications.

---

📊 Dashboard & UX

"FIRE Readiness" Indicator
A live indicator showing whether the current portfolio — at the current age — already generates enough to cover the target income at the user's withdrawal rate. Something like a progress bar or a simple "€X of €Y target monthly income covered" badge on the Summary Cards. This is the most emotionally resonant number in any FIRE calculator and currently isn't surfaced directly.