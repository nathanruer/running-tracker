import { parseDuration } from './parse';

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
 * Normalizes a duration string to a consistent smart format
 * Parses the input and re-formats it using the smart formatter
 *
 * @param input - Duration string in MM:SS or HH:MM:SS format
 * @returns Normalized duration string, or null if invalid
 */
export function normalizeDurationFormat(input: string): string | null {
  const seconds = parseDuration(input);

  if (seconds === null) {
    return null;
  }

  return formatDuration(seconds);
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

/**
 * Formats duration string to a normalized format for display
 * @param duration - Duration string (e.g., "01:23:45" or "1:23")
 * @returns Normalized duration string or "--" if invalid
 */
export function formatDisplayDuration(duration: string | null | undefined): string {
  if (!duration) return '--';
  return normalizeDurationFormat(duration) || duration;
}

/**
 * Formats a duration in minutes to HH:MM:SS format
 * Useful for targetDuration which is stored in minutes
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string in HH:MM:SS
 *
 * @example
 * formatMinutesToHHMMSS(45)   // "00:45:00"
 * formatMinutesToHHMMSS(90)   // "01:30:00"
 * formatMinutesToHHMMSS(125)  // "02:05:00"
 */
export function formatMinutesToHHMMSS(minutes: number): string {
  if (minutes < 0 || !isFinite(minutes)) {
    return '00:00:00';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}
