import { parseHRValue } from './parse';

export interface HRDisplayOptions {
  useApproximation?: boolean;
  fallbackValue?: number | string | null;
  includeUnit?: boolean;
  emptyValue?: string;
}

/**
 * Formats heart rate with bpm unit
 * @param bpm - Heart rate in beats per minute
 * @returns Formatted heart rate string
 * @example formatHeartRate(145) // "145 bpm"
 */
export function formatHeartRate(bpm: number): string {
  return bpm > 0 ? `${Math.round(bpm)} bpm` : '--';
}

/**
 * Format heart rate for display with fallback logic
 *
 * @param calculated Calculated/measured HR value
 * @param fallback Fallback target HR value
 * @param options Display options
 * @returns Formatted HR string
 */
export function formatHRDisplay(
  calculated: number | null | undefined,
  fallback: number | string | null | undefined,
  options: HRDisplayOptions = {}
): string {
  const {
    useApproximation = true,
    includeUnit = true,
    emptyValue = '-'
  } = options;

  const calculatedValue = calculated ?? null;
  if (calculatedValue && calculatedValue > 0) {
    const approx = useApproximation ? '~' : '';
    const unit = includeUnit ? ' bpm' : '';
    return `${approx}${Math.round(calculatedValue)}${unit}`;
  }

  const parsedFallback = parseHRValue(fallback ?? null);
  if (parsedFallback && parsedFallback > 0) {
    const approx = useApproximation ? '~' : '';
    const unit = includeUnit ? ' bpm' : '';
    return `${approx}${Math.round(parsedFallback)}${unit}`;
  }

  return emptyValue;
}
