/**
 * Theme-aware color utilities for Chart.js.
 * Reads CSS custom properties at runtime so charts stay in sync with light/dark mode.
 */

/**
 * Read a CSS custom property from :root and return it as an hsl() string.
 * The CSS vars store values in "H S% L%" format (e.g. "217 91% 60%").
 */
export function getCssColor(varName: string, alpha?: number): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return alpha !== undefined ? `hsla(0, 0%, 50%, ${alpha})` : 'hsl(0, 0%, 50%)';
  if (alpha !== undefined) return `hsla(${raw.replace(/ /g, ', ')}, ${alpha})`;
  return `hsl(${raw.replace(/ /g, ', ')})`;
}

/** Semantic account colors */
export const ACCOUNT_KEYS = ['Savings', 'Pension', 'Brokerage'] as const;

export function getAccountColor(account: string, alpha?: number): string {
  switch (account) {
    case 'Savings':
      return getCssColor('--savings', alpha);
    case 'Pension':
      return getCssColor('--pension', alpha);
    case 'Brokerage':
      return getCssColor('--brokerage', alpha);
    default:
      return getCssColor('--foreground', alpha);
  }
}

/** Phase band colors — subtle, translucent backgrounds */
export function getPhaseColor(phase: 'working' | 'bridging' | 'drawdown'): string {
  switch (phase) {
    case 'working':
      return getCssColor('--savings', 0.06);
    case 'bridging':
      return 'hsla(38, 92%, 50%, 0.06)'; // amber
    case 'drawdown':
      return getCssColor('--pension', 0.06);
  }
}

export function getPhaseLabelColor(phase: 'working' | 'bridging' | 'drawdown'): string {
  switch (phase) {
    case 'working':
      return getCssColor('--savings', 0.55);
    case 'bridging':
      return 'hsla(38, 92%, 50%, 0.55)';
    case 'drawdown':
      return getCssColor('--pension', 0.55);
  }
}

/** Opaque pill background for phase labels rendered on the chart canvas */
export function getPhasePillBg(phase: 'working' | 'bridging' | 'drawdown'): string {
  const isDark = document.documentElement.classList.contains('dark');
  switch (phase) {
    case 'working':
      return isDark ? 'hsl(217, 50%, 18%)' : 'hsl(214, 95%, 93%)';
    case 'bridging':
      return isDark ? 'hsl(38, 50%, 18%)' : 'hsl(38, 90%, 90%)';
    case 'drawdown':
      return isDark ? 'hsl(160, 40%, 16%)' : 'hsl(152, 76%, 91%)';
  }
}

/** Opaque text color for phase pill labels */
export function getPhasePillText(phase: 'working' | 'bridging' | 'drawdown'): string {
  const isDark = document.documentElement.classList.contains('dark');
  switch (phase) {
    case 'working':
      return isDark ? 'hsl(217, 91%, 72%)' : 'hsl(217, 70%, 40%)';
    case 'bridging':
      return isDark ? 'hsl(38, 90%, 65%)' : 'hsl(38, 80%, 35%)';
    case 'drawdown':
      return isDark ? 'hsl(160, 80%, 55%)' : 'hsl(160, 60%, 30%)';
  }
}

/** Opaque border color for phase pills */
export function getPhasePillBorder(phase: 'working' | 'bridging' | 'drawdown'): string {
  const isDark = document.documentElement.classList.contains('dark');
  switch (phase) {
    case 'working':
      return isDark ? 'hsl(217, 60%, 30%)' : 'hsl(214, 80%, 82%)';
    case 'bridging':
      return isDark ? 'hsl(38, 60%, 30%)' : 'hsl(38, 80%, 78%)';
    case 'drawdown':
      return isDark ? 'hsl(160, 50%, 28%)' : 'hsl(152, 60%, 78%)';
  }
}

/** Colors for the Principal/Interest (Deposits vs Growth) chart */
export function getPrincipalColor(alpha?: number) {
  return getCssColor('--brokerage', alpha);
}
export function getInterestColor(alpha?: number) {
  return alpha !== undefined ? `hsla(180, 75%, 40%, ${alpha})` : 'hsl(180, 75%, 40%)';
}
