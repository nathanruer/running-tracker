import { formatDurationSmart as formatDurationSmartUtil, parseDurationToSeconds } from './duration';

/**
 * Formats a duration in seconds to smart format (MM:SS or HH:MM:SS)
 * Uses MM:SS for durations < 1 hour, HH:MM:SS for >= 1 hour
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 * @example formatDuration(2910) // "48:30" (< 1 hour)
 * @example formatDuration(5400) // "01:30:00" (>= 1 hour)
 * @deprecated Use formatDurationSmart from duration.ts for explicit smart formatting
 */
export function formatDuration(seconds: number): string {
  return formatDurationSmartUtil(seconds);
}

/**
 * Formats a duration in seconds to MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (MM:SS)
 * @example formatDurationShort(125) // "02:05"
 * @deprecated Use formatDurationSmart from duration.ts which intelligently chooses format
 */
export function formatDurationShort(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) {
    return '00:00';
  }

  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const secs = roundedSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates and formats pace (min/km) from distance and time
 * @param distanceMeters - Distance in meters
 * @param timeSeconds - Time in seconds
 * @returns Formatted pace string (MM:SS per km)
 * @example formatPace(5000, 1500) // "05:00"
 */
export function formatPace(distanceMeters: number, timeSeconds: number): string {
  if (distanceMeters === 0) return '00:00';

  const kmPerMinute = (timeSeconds / 60) / (distanceMeters / 1000);
  const minutes = Math.floor(kmPerMinute);
  const seconds = Math.round((kmPerMinute - minutes) * 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats distance with appropriate unit
 * @param meters - Distance in meters
 * @param unit - Target unit ('km' or 'm')
 * @param decimals - Number of decimal places (default: 1 for km, 0 for m)
 * @returns Formatted distance string with unit
 * @example formatDistance(5432) // "5.4 km"
 * @example formatDistance(543, 'm') // "543 m"
 */
export function formatDistance(
  meters: number,
  unit: 'km' | 'm' = 'km',
  decimals?: number
): string {
  if (unit === 'km') {
    const km = meters / 1000;
    const dec = decimals !== undefined ? decimals : 1;
    return `${km.toFixed(dec)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Formats a date to a localized string
 * @param date - Date string or Date object
 * @param format - Format type ('short', 'long', 'iso')
 * @returns Formatted date string
 * @example formatDate(new Date('2024-01-15')) // "15/01/2024"
 * @example formatDate('2024-01-15', 'long') // "15 janvier 2024"
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'iso' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'iso') {
    return dateObj.toISOString().split('T')[0];
  }

  if (format === 'long') {
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return dateObj.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Parses a duration string (HH:MM:SS or MM:SS) to seconds
 * @param duration - Duration string
 * @returns Duration in seconds (returns 0 if invalid)
 * @example parseDuration("01:30:00") // 5400
 * @example parseDuration("05:30") // 330
 * @deprecated Use parseDurationToSeconds from duration.ts which returns null for invalid input
 */
export function parseDuration(duration: string): number {
  const result = parseDurationToSeconds(duration);
  return result ?? 0;
}

/**
 * Formats a number with thousand separators
 * @param num - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 * @example formatNumber(1234.56) // "1 234,56"
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats heart rate with bpm unit
 * @param bpm - Heart rate in beats per minute
 * @returns Formatted heart rate string
 * @example formatHeartRate(145) // "145 bpm"
 */
export function formatHeartRate(bpm: number): string {
  return bpm > 0 ? `${Math.round(bpm)} bpm` : '--';
}

/**
 * Normalizes a pace string to ensure consistent MM:SS format with leading zeros
 * @param pace - Pace string (may be 5:00, 05:00, etc.)
 * @returns Normalized pace string (MM:SS with leading zeros)
 * @example normalizePaceDisplay("5:00") // "05:00"
 */
export function normalizePaceDisplay(pace: string | null | undefined): string | null {
  if (!pace) return null;
  
  const parts = pace.split(':');
  if (parts.length !== 2) return pace;
  
  const minutes = parts[0].padStart(2, '0');
  const seconds = parts[1].padStart(2, '0');
  return `${minutes}:${seconds}`;
}
