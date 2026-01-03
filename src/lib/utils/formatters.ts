/**
 * Calculates and formats pace (min/km) from distance and time
 * @param distanceMeters - Distance in meters
 * @param timeSeconds - Time in seconds
 * @returns Formatted pace string (MM:SS per km)
 * @example formatPace(5000, 1500) // "05:00"
 */
export function calculatePaceString(distanceMeters: number, timeSeconds: number): string {
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
 * Formats a date to ISO format (YYYY-MM-DD) without time component
 * Useful for date inputs and API payloads
 *
 * @param date - Date object or ISO string
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * formatDateToISO(new Date('2024-01-15')) // '2024-01-15'
 * formatDateToISO('2024-01-15T10:30:00Z') // '2024-01-15'
 */
export function formatDateToISO(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

/**
 * Returns today's date in ISO format (YYYY-MM-DD)
 * Convenience function for form defaults
 *
 * @returns Today's date in YYYY-MM-DD format
 *
 * @example
 * getTodayISO() // '2024-01-15'
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Extracts date part from a date string that may or may not contain time
 * Handles both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:MM:SS' formats
 *
 * @param dateString - Date string
 * @returns Date in YYYY-MM-DD format
 *
 * @example
 * extractDatePart('2024-01-15T10:30:00') // '2024-01-15'
 * extractDatePart('2024-01-15') // '2024-01-15'
 */
export function extractDatePart(dateString: string): string {
  return dateString.includes('T') ? dateString.split('T')[0] : dateString;
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
 * Extracts numeric value from heart rate (handles both number and string)
 * Used for heart rate comparisons and storage.
 */
export function extractHeartRateValue(hr: number | string | null | undefined): number | null {
  if (hr === null || hr === undefined) return null;
  if (typeof hr === 'number') return hr;
  if (typeof hr === 'string') {
    const parsed = parseFloat(hr);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
