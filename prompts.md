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