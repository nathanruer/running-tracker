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
