/**
 * Parse a form field value that may be `number | ''` into a plain number.
 * Returns the value if it's a number, or the fallback (default: NaN) otherwise.
 */
export function parseNumeric(value: number | '', fallback: number = NaN): number {
  return typeof value === 'number' ? value : fallback;
}
