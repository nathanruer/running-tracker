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

/**
 * Extracts numeric value from heart rate (handles both number and string)
 * Used for heart rate comparisons and storage.
 */
export function extractHeartRateValue(hr: number | string | null | undefined): number | null {
  if (hr === null || hr === undefined) return null;
  if (typeof hr === 'number') return hr;
  if (typeof hr === 'string') {
    const parsed = parseFloat(hr);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
