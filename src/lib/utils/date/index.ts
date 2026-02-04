/**
 * Date formatting utilities
 */

// Week utilities
export {
  getISOWeekKey,
  getISOWeekNumber,
  getISOWeekYear,
  getISOWeekStart,
  getISOWeekEnd,
} from './week';

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
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
