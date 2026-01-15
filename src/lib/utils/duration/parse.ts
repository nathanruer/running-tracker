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
 * Validates a duration input string
 * Accepts both MM:SS and HH:MM:SS formats
 *
 * @param input - Duration string to validate
 * @returns true if valid, false otherwise
 */
export function validateDurationInput(input: string): boolean {
  return parseDuration(input) !== null;
}

/**
 * Normalizes various duration formats to MM:SS format
 * Handles multiple input formats:
 * - Apostrophe notation: "5'00", "45'30"
 * - Colon notation: "5:00", "05:00"
 * - HH:MM:SS format: "01:30:00" (converts to MM:SS when convertHoursToMinutes is true)
 * - Plain numbers: "5" (interpreted as minutes)
 */
export function normalizeDurationToMMSS(
  input: string,
  options?: { convertHoursToMinutes?: boolean }
): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

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

  if (trimmed.includes(':')) {
    const cleanDuration = trimmed.split('.')[0];
    const parts = cleanDuration.split(':').map(part => parseInt(part, 10));

    if (parts.some(part => isNaN(part) || part < 0)) {
      return null;
    }

    if (parts.length === 2) {
      const [minutes, seconds] = parts;

      if (seconds >= 60) {
        return null;
      }

      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;

      if (minutes >= 60 || seconds >= 60) {
        return null;
      }

      if (options?.convertHoursToMinutes) {
        const totalMinutes = hours * 60 + minutes;
        return `${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return null;
      }
    }

    return null;
  }

  const cleaned = trimmed.replace(/['"]/g, '');
  const minutes = parseInt(cleaned, 10);

  if (!isNaN(minutes) && minutes >= 0) {
    return `${minutes.toString().padStart(2, '0')}:00`;
  }

  return null;
}
