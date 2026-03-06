// Barrel exports for chart infrastructure
export { getBaseOptions, formatTooltipValue } from './chartConfig';
export {
  getCssColor,
  getAccountColor,
  getPhaseColor,
  getPhaseLabelColor,
  getPhasePillBg,
  getPhasePillText,
  getPhasePillBorder,
  getPrincipalColor,
  getInterestColor,
  ACCOUNT_KEYS,
} from './chartTheme';
export { phaseBandsPlugin } from './phaseBandsPlugin';
export type { PhaseBandsOptions } from './phaseBandsPlugin';
export { useChartData } from './useChartData';
export type { MCViewMode } from './useChartData';
export { useExternalTooltip } from './useExternalTooltip';
export { PortfolioGrowthChart } from './PortfolioGrowthChart';
export { MonteCarloChart } from './MonteCarloChart';
export { ContributionsGrowthChart } from './ContributionsGrowthChart';
export { AnnualFlowsChart } from './AnnualFlowsChart';
export { IncomeTimelineChart } from './IncomeTimelineChart';
