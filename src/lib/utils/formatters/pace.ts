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
