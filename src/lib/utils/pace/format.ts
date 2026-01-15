import { parseDuration, formatDuration } from '../duration';

/**
 * Converts velocity (m/s) to pace (seconds per km)
 * @param mps Velocity in meters per second
 * @returns Pace in seconds per kilometer
 */
export function mpsToSecondsPerKm(mps: number): number {
  if (mps <= 0) return 0;
  return 1000 / mps;
}

/**
 * Formats pace (seconds per km) to MM:SS string
 * @param secondsPerKm Pace in seconds per kilometer
 * @returns Formatted string (e.g. "5:30") or "-" if invalid
 */
export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm)) return '-';
  
  const totalSeconds = Math.round(secondsPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Converts velocity (m/s) to formatted pace string
 * @param mps Velocity in meters per second
 * @returns Formatted string (e.g. "5:30")
 */
export function mpsToMinPerKm(mps: number): string {
  return formatPace(mpsToSecondsPerKm(mps));
}

/**
 * Converts total seconds to pace string (MM:SS)
 * Rounds the total first to avoid edge cases like "5:60"
 * @param totalSeconds Total seconds (can be fractional)
 * @returns Formatted string (e.g. "05:30") or "-" if invalid
 */
export function secondsToPace(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds <= 0 || !isFinite(totalSeconds)) {
    return '-';
  }
  const roundedTotal = Math.round(totalSeconds);
  const min = Math.floor(roundedTotal / 60);
  const sec = roundedTotal % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Formats pace string for display
 * @param pace - Pace string
 * @returns Pace string or "--" if invalid
 */
export function formatDisplayPace(pace: string | null | undefined): string {
  return pace || '--';
}

/**
 * Calculates and formats pace (min/km) from distance and time
 * @param distanceMeters - Distance in meters
 * @param timeSeconds - Time in seconds
 * @returns Formatted pace string (MM:SS per km)
 * @example calculatePaceString(5000, 1500) // "05:00"
 */
export function calculatePaceString(distanceMeters: number, timeSeconds: number): string {
  if (distanceMeters === 0) return '00:00';

  const kmPerMinute = (timeSeconds / 60) / (distanceMeters / 1000);
  const minutes = Math.floor(kmPerMinute);
  const seconds = Math.round((kmPerMinute - minutes) * 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
  
  return formatDuration(paceSeconds);
}
