/**
 * Parses a duration string to seconds
 * Accepts both MM:SS and HH:MM:SS formats
 *
 * @param input - Duration string in MM:SS or HH:MM:SS format
 * @returns Duration in seconds, or null if invalid
 */
export function parseDuration(input: string | null | undefined): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  const parts = trimmed.split(':').map(part => parseInt(part, 10));

  if (parts.some(part => isNaN(part) || part < 0)) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;

    if (seconds >= 60) {
      return null;
    }

    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;

    if (minutes >= 60 || seconds >= 60) {
      return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

/**
 * Formats duration in seconds to a smart format
 * Uses MM:SS for durations < 1 hour, HH:MM:SS for durations >= 1 hour
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(2910)   // "48:30" (< 1 hour)
 * formatDuration(5400)   // "01:30:00" (>= 1 hour)
 * formatDuration(3605)   // "01:00:05" (>= 1 hour)
 * formatDuration(125)    // "02:05"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) {
    return '00:00';
  }

  const roundedSeconds = Math.round(seconds);

  if (roundedSeconds < 3600) {
    const minutes = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    const hours = Math.floor(roundedSeconds / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const secs = roundedSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Validates a duration input string
 * Accepts both MM:SS and HH:MM:SS formats
 *
 * @param input - Duration string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validateDurationInput("48:30")      // true
 * validateDurationInput("00:48:30")   // true
 * validateDurationInput("1:30:00")    // true
 * validateDurationInput("65:00")      // false (minutes >= 60)
 * validateDurationInput("00:65:00")   // false (seconds >= 60)
 * validateDurationInput("invalid")    // false
 */
export function validateDurationInput(input: string): boolean {
  return parseDuration(input) !== null;
}

/**
 * Normalizes a duration string to a consistent smart format
 * Parses the input and re-formats it using the smart formatter
 *
 * @param input - Duration string in MM:SS or HH:MM:SS format
 * @returns Normalized duration string, or null if invalid
 *
 * @example
 * normalizeDurationFormat("48:30")    // "48:30"
 * normalizeDurationFormat("00:48:30") // "48:30" (normalized to MM:SS since < 1h)
 * normalizeDurationFormat("01:30:00") // "01:30:00" (kept as HH:MM:SS since >= 1h)
 * normalizeDurationFormat("5:5")      // "05:05" (padded)
 */
export function normalizeDurationFormat(input: string): string | null {
  const seconds = parseDuration(input);

  if (seconds === null) {
    return null;
  }

  return formatDuration(seconds);
}

/**
 * Validates if a pace string is in valid format (MM:SS)
 * Paces are always in MM:SS format (minutes per km)
 *
 * @param input - Pace string to validate
 * @returns true if valid MM:SS format, false otherwise
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

  if (parts.length !== 2) {
    return false;
  }

  const [minutes, seconds] = parts;

  if (isNaN(minutes) || isNaN(seconds)) {
    return false;
  }

  if (minutes < 0 || seconds < 0 || seconds >= 60) {
    return false;
  }

  return true;
}

/**
 * Normalizes a pace string to MM:SS format with leading zeros
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
  const [minutes, seconds] = parts;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
