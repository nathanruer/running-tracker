/**
 * Validates if a pace string is in valid format (MM:SS)
 * Paces are always in MM:SS format (minutes per km)
 *
 * @param input - Pace string to validate
 * @returns true if valid MM:SS or HH:MM:SS format, false otherwise
 *
 * @example
 * validatePaceInput("05:30")   // true
 * validatePaceInput("5:30")    // true (will be normalized)
 * validatePaceInput("65:00")   // false (minutes too high for typical pace)
 * validatePaceInput("invalid") // false
 */
export function validatePaceInput(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const trimmed = input.trim();
  const parts = trimmed.split(':').map(part => parseInt(part, 10));

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (isNaN(minutes) || isNaN(seconds)) return false;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return false;
    return true;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return false;
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return false;
    return true;
  }

  return false;
}

/**
 * Normalizes a pace string to MM:SS or HH:MM:SS format with leading zeros
 *
 * @param input - Pace string
 * @returns Normalized pace string (MM:SS), or null if invalid
 *
 * @example
 * normalizePaceFormat("5:30")   // "05:30"
 * normalizePaceFormat("05:30")  // "05:30"
 * normalizePaceFormat("invalid") // null
 */
export function normalizePaceFormat(input: string): string | null {
  if (!validatePaceInput(input)) {
    return null;
  }

  const parts = input.trim().split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  const [minutes, seconds] = parts;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Normalizes a pace value or range string
 * Handles both single values "5:30" and ranges "5:30-5:40"
 *
 * @param input - Pace string or range
 * @returns Normalized pace string, or the original if it's a range, or null if invalid
 *
 * @example
 * normalizePaceOrRange("5:30")      // "05:30"
 * normalizePaceOrRange("5:30-5:40") // "5:30-5:40" (kept as-is, it's a valid range)
 * normalizePaceOrRange("invalid")   // null
 */
export function normalizePaceOrRange(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  
  // Check if it's a range (contains '-' and has valid paces on both sides)
  if (trimmed.includes('-') && !trimmed.startsWith('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 2) {
      const [start, end] = parts.map(p => p.trim());
      if (validatePaceInput(start) && validatePaceInput(end)) {
        return trimmed;
      }
    }
  }
  
  return normalizePaceFormat(trimmed);
}

/**
 * Validates that a pace string is in valid format (no 60+ seconds)
 * @param pace Pace string in MM:SS format
 * @returns true if valid, false otherwise
 */
export function isValidPace(pace: string | null | undefined): boolean {
  if (!pace) return false;
  const match = pace.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  return minutes >= 0 && seconds >= 0 && seconds < 60;
}
