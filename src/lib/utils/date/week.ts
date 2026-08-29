/**
 * Date utilities for ISO week calculations.
 * Used for session numbering and week grouping.
 */

import { MONTHS_SHORT_FR } from './index';

/**
 * Returns an ISO week key in format "YYYY-Wnn" (e.g., "2024-W01")
 * Uses ISO 8601 week numbering where weeks start on Monday.
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  
  // Get day of week (Monday = 1, Sunday = 7)
  const dayNum = d.getDay() || 7;
  
  // Set to Thursday in current week (ISO week belongs to year of Thursday)
  d.setDate(d.getDate() + 4 - dayNum);
  
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return `${d.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Returns just the ISO week number (1-53)
 */
export function getISOWeekNumber(date: Date): number {
  const weekKey = getISOWeekKey(date);
  return parseInt(weekKey.split('-W')[1], 10);
}

/**
 * Returns the year that the ISO week belongs to.
 * Note: This may differ from date.getFullYear() for dates near year boundaries.
 */
export function getISOWeekYear(date: Date): number {
  const weekKey = getISOWeekKey(date);
  return parseInt(weekKey.split('-W')[0], 10);
}

/**
 * Returns the start of the ISO week (Monday at 00:00:00)
 */
export function getISOWeekStart(date: Date): Date {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() - dayNum + 1);
  return d;
}

/**
 * Returns the end of the ISO week (Sunday at 23:59:59.999)
 */
export function getISOWeekEnd(date: Date): Date {
  const start = getISOWeekStart(date);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Formats a week range label like "Semaine du 24 – 30 août" (year appended when not current).
 */
export function formatWeekRangeLabel(date: Date, now: Date = new Date()): string {
  const start = getISOWeekStart(date);
  const end = getISOWeekEnd(date);
  const startMonth = MONTHS_SHORT_FR[start.getMonth()];
  const endMonth = MONTHS_SHORT_FR[end.getMonth()];
  const yearSuffix = end.getFullYear() !== now.getFullYear() ? ` ${end.getFullYear()}` : '';

  if (start.getMonth() === end.getMonth()) {
    return `Semaine du ${start.getDate()} – ${end.getDate()} ${endMonth}${yearSuffix}`;
  }
  return `Semaine du ${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}${yearSuffix}`;
}
