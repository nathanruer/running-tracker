/**
 * Number formatting utilities
 */

/**
 * Formats a number with thousand separators
 * @param num - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 * @example formatNumber(1234.56) // "1 234,56"
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export type ParsedNumberInput = number | null | '-' | undefined;

export function parseNullableNumberInput(
  value: string,
  options?: { mode?: 'int' | 'float'; decimals?: number; allowNegativeSign?: boolean }
): ParsedNumberInput {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (options?.allowNegativeSign && trimmed === '-') return trimmed;

  const parsed =
    options?.mode === 'int'
      ? Number.parseInt(trimmed, 10)
      : Number.parseFloat(trimmed);

  if (Number.isNaN(parsed)) return undefined;

  if (options?.mode !== 'int' && typeof options?.decimals === 'number') {
    const factor = 10 ** options.decimals;
    return Math.round(parsed * factor) / factor;
  }

  return parsed;
}
