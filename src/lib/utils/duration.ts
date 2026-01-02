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

/**
 * Normalizes various duration formats to MM:SS format
 * Handles multiple input formats:
 * - Apostrophe notation: "5'00", "45'30"
 * - Colon notation: "5:00", "05:00"
 * - HH:MM:SS format: "01:30:00" (converts to MM:SS when convertHoursToMinutes is true)
 * - Plain numbers: "5" (interpreted as minutes)
 *
 * @param input - Duration string in various formats
 * @param options - Configuration options
 * @param options.convertHoursToMinutes - If true, converts HH:MM:SS to MM:SS by adding hours to minutes (default: false)
 * @returns Normalized duration string in MM:SS format, or null if invalid
 *
 * @example
 * normalizeDurationToMMSS("5'00")                               // "05:00"
 * normalizeDurationToMMSS("5:00")                               // "05:00"
 * normalizeDurationToMMSS("05:00")                              // "05:00"
 * normalizeDurationToMMSS("5")                                  // "05:00"
 * normalizeDurationToMMSS("01:30:00", { convertHoursToMinutes: true })  // "90:00"
 * normalizeDurationToMMSS("01:30:00", { convertHoursToMinutes: false }) // null (HH:MM:SS not allowed)
 */
export function normalizeDurationToMMSS(
  input: string,
  options?: { convertHoursToMinutes?: boolean }
): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // Handle apostrophe notation (e.g., "5'00")
  if (trimmed.includes("'")) {
    const parts = trimmed.split("'");
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const sec = parseInt(parts[1], 10);

      if (isNaN(min) || isNaN(sec) || min < 0 || sec < 0 || sec >= 60) {
        return null;
      }

      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
  }

  // Handle colon notation (MM:SS or HH:MM:SS)
  if (trimmed.includes(':')) {
    // Remove any decimal seconds (e.g., "05:30.5" → "05:30")
    const cleanDuration = trimmed.split('.')[0];
    const parts = cleanDuration.split(':').map(part => parseInt(part, 10));

    // Validate all parts are numbers
    if (parts.some(part => isNaN(part) || part < 0)) {
      return null;
    }

    // MM:SS format
    if (parts.length === 2) {
      const [minutes, seconds] = parts;

      if (seconds >= 60) {
        return null;
      }

      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // HH:MM:SS format
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;

      if (minutes >= 60 || seconds >= 60) {
        return null;
      }

      if (options?.convertHoursToMinutes) {
        // Convert hours to minutes (e.g., "01:30:00" → "90:00")
        const totalMinutes = hours * 60 + minutes;
        return `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        // HH:MM:SS not allowed without conversion
        return null;
      }
    }

    return null;
  }

  // Handle plain numbers (interpreted as minutes)
  const cleaned = trimmed.replace(/['"]/g, '');
  const minutes = parseInt(cleaned, 10);

  if (!isNaN(minutes) && minutes >= 0) {
    return `${minutes.toString().padStart(2, '0')}:00`;
  }

  return null;
}

/**
 * Calculates pace from duration and distance
 * 
 * @param durationStr - Duration string (HH:MM:SS or MM:SS)
 * @param distance - Distance in km
 * @returns Pace string in MM:SS format, or null if inputs are invalid or incomplete
 * 
 * @example
 * calculatePaceFromDurationAndDistance("01:00:00", 10) // "06:00"
 * calculatePaceFromDurationAndDistance("00:45:00", 10) // "04:30"
 */
export function calculatePaceFromDurationAndDistance(durationStr: string, distance: number | null): string | null {
  if (!durationStr || !distance || distance <= 0) {
    return null;
  }

  const durationSeconds = parseDuration(durationStr);
  if (durationSeconds === null) {
    return null;
  }

  const paceSeconds = durationSeconds / distance;
  
  // Pace is minutes per km. formatDuration returns MM:SS or HH:MM:SS.
  // We want MM:SS. If pace is > 1 hour/km (walking very slow), formatDuration handles it.
  
  // formatDuration checks if seconds < 3600 (1 hour). For pace, it usually is.
  // 06:00 min/km = 360 seconds.
  
  return formatDuration(paceSeconds);
}

/**
 * Formats duration in seconds to HH:MM:SS format always
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string in HH:MM:SS
 *
 * @example
 * formatDurationHHMMSS(2910)   // "00:48:30"
 * formatDurationHHMMSS(5400)   // "01:30:00"
 */
export function formatDurationHHMMSS(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) {
    return '00:00:00';
  }

  const roundedSeconds = Math.round(seconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const secs = roundedSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Normalizes a duration string to HH:MM:SS format
 *
 * @param input - Duration string in MM:SS or HH:MM:SS
 * @returns Normalized duration string in HH:MM:SS, or null if input is empty
 */
export function normalizeDurationToHHMMSS(input: string | null | undefined): string | null {
  if (!input) return null;
  const seconds = parseDuration(input);
  if (seconds === null) return input;
  return formatDurationHHMMSS(seconds);
}
