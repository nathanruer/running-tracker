import { parseDuration } from './parse';

/**
 * Converts a duration string to minutes
 * Accepts both MM:SS and HH:MM:SS formats
 *
 * @param duration - Duration string in MM:SS or HH:MM:SS format
 * @returns Duration in minutes (rounded), or 0 if invalid
 *
 * @example
 * convertDurationToMinutes("01:30:00") // 90 (1h30 = 90 minutes)
 * convertDurationToMinutes("45:00")    // 45
 * convertDurationToMinutes("00:30")    // 1 (30 seconds rounded to 1 minute)
 * convertDurationToMinutes("invalid")  // 0
 */
export function convertDurationToMinutes(duration: string): number {
  const seconds = parseDuration(duration);
  if (seconds === null) return 0;
  return Math.round(seconds / 60);
}
