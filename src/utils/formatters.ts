/**
 * Deflate a nominal amount to present-value terms.
 * Returns `amount / (1 + inflationRate/100)^years`.
 */
export function deflate(amount: number, years: number, inflationRate: number): number {
  if (years <= 0 || inflationRate === 0) return amount;
  return amount / Math.pow(1 + inflationRate / 100, years);
}

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
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${sign}€${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}€${(abs / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}
