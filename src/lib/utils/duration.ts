/**
 * Parses a duration string to seconds
 * Accepts both MM:SS and HH:MM:SS formats
 *
 * @param input - Duration string in MM:SS or HH:MM:SS format
 * @returns Duration in seconds, or null if invalid
 *
 * @example
 * parseDurationToSeconds("48:30")      // 2910 (48 minutes, 30 seconds)
 * parseDurationToSeconds("00:48:30")   // 2910 (same as above)
 * parseDurationToSeconds("01:30:00")   // 5400 (1 hour, 30 minutes)
 * parseDurationToSeconds("invalid")    // null
 */
export function parseDurationToSeconds(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  const parts = trimmed.split(':').map(part => parseInt(part, 10));

  // Validate all parts are valid numbers
  if (parts.some(part => isNaN(part) || part < 0)) {
    return null;
  }

  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;

    // Validate seconds are < 60
    if (seconds >= 60) {
      return null;
    }

    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;

    // Validate minutes and seconds are < 60
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
 * formatDurationSmart(2910)   // "48:30" (< 1 hour)
 * formatDurationSmart(5400)   // "01:30:00" (>= 1 hour)
 * formatDurationSmart(125)    // "02:05"
 */
export function formatDurationSmart(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) {
    return '00:00';
  }

  const roundedSeconds = Math.round(seconds);

  if (roundedSeconds < 3600) {
    // Less than 1 hour: use MM:SS format
    const minutes = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    // 1 hour or more: use HH:MM:SS format
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
  return parseDurationToSeconds(input) !== null;
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
  const seconds = parseDurationToSeconds(input);

  if (seconds === null) {
    return null;
  }

  return formatDurationSmart(seconds);
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

  // Pace should be MM:SS format (2 parts only)
  if (parts.length !== 2) {
    return false;
  }

  const [minutes, seconds] = parts;

  // Validate all parts are valid numbers
  if (isNaN(minutes) || isNaN(seconds)) {
    return false;
  }

  // Validate values are >= 0 and seconds < 60
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
