/**
 * Format a number as currency (EUR)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as currency with decimals
 */
export function formatCurrencyWithDecimals(value: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `€${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `€${(value / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

/**
 * Calculate the number of months remaining until the end of the current year
 */
export function getMonthsUntilYearEnd(): number {
  const today = new Date();
  const endOfYear = new Date(today.getFullYear(), 11, 31); // December 31 of current year (month is 0-indexed)
  
  const monthsLeft = (endOfYear.getFullYear() - today.getFullYear()) * 12 + (endOfYear.getMonth() - today.getMonth());
  return Math.max(monthsLeft, 0); // Return 0 if we're past December 31
}
