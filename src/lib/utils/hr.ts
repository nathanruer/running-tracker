export interface HRDisplayOptions {
  useApproximation?: boolean;
  fallbackValue?: number | string | null;
  includeUnit?: boolean;
  emptyValue?: string;
}

/**
 * Parse heart rate value from various formats:
 * - number: 160
 * - string range: "160-170" -> average (165)
 * - string single: "160" -> 160
 *
 * @param hrInput HR value in various formats
 * @returns Parsed HR value or null if invalid
 */
export function parseHRValue(hrInput: string | number | null | undefined): number | null {
  if (hrInput == null) return null;

  if (typeof hrInput === 'number') {
    return hrInput > 0 ? hrInput : null;
  }

  const rangeMatch = hrInput.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    return (min + max) / 2;
  }

  const single = parseInt(hrInput, 10);
  return !isNaN(single) && single > 0 ? single : null;
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

/**
 * Extract HR value from interval step considering both hr and hrRange fields
 *
 * @param step Interval step with hr and optionally hrRange
 * @returns HR value or null
 */
export function extractStepHR(step: { hr?: number | null; hrRange?: string | null }): number | null {
  if (step.hr != null && step.hr > 0) {
    return step.hr;
  }

  if (step.hrRange) {
    return parseHRValue(step.hrRange);
  }

  return null;
}

/**
 * Check if a step or session has any HR data
 *
 * @param data Object with HR-related fields
 * @returns True if any HR data is available
 */
export function hasHRData(
  data: { hr?: number | null; hrRange?: string | null } | null | undefined
): boolean {
  if (!data) return false;
  return (data.hr != null && data.hr > 0) || (data.hrRange != null && data.hrRange.length > 0);
}
