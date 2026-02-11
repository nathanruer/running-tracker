import { DATE_RANGES, MS_PER_DAY } from '@/lib/constants/time';
import { getISOWeekStart, MONTHS_SHORT_FR } from '@/lib/utils/date';

export type DateRangeType = '4weeks' | '8weeks' | '12weeks' | 'all' | 'custom';
export type ChartGranularity = 'day' | 'week' | 'month';

export interface DateRangeResolution {
  start: Date | null;
  end: Date | null;
  label: string;
}

export function parseDateInput(value?: string | null): Date | null {
  if (!value) return null;
  if (value.includes('T')) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return startOfDay(parsed);
    }
  }

  const [year, month, day] = value.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function diffDaysInclusive(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  if (endUtc < startUtc) return 0;
  return Math.floor((endUtc - startUtc) / MS_PER_DAY) + 1;
}

export function formatDateRangeLabel(start: Date | null, end: Date | null): string {
  if (!start || !end) return 'Aucune donnée';
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = formatShortDate(start, !sameYear);
  const endLabel = formatShortDate(end, true);
  return `${startLabel} → ${endLabel}`;
}

function formatShortDate(date: Date, includeYear: boolean): string {
  const label = `${date.getDate()} ${MONTHS_SHORT_FR[date.getMonth()]}`;
  return includeYear ? `${label} ${date.getFullYear()}` : label;
}

function getEarliestDate(dates: string[]): Date | null {
  const parsedDates = dates
    .map((value) => parseDateInput(value))
    .filter((date): date is Date => Boolean(date));

  if (parsedDates.length === 0) return null;
  return parsedDates.reduce((earliest, current) => (current < earliest ? current : earliest));
}

export function resolveDateRange(params: {
  dateRange: DateRangeType;
  customStartDate?: string;
  customEndDate?: string;
  sessionDates?: string[];
  referenceDate?: Date;
}): DateRangeResolution {
  const now = params.referenceDate ?? new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const sessionDates = params.sessionDates ?? [];
  const earliest = getEarliestDate(sessionDates);

  switch (params.dateRange) {
    case '4weeks':
    case '8weeks':
    case '12weeks': {
      const weeks = params.dateRange === '4weeks'
        ? 4
        : params.dateRange === '8weeks'
          ? 8
          : 12;
      const currentWeekStart = getISOWeekStart(todayStart);
      const rangeEnd = endOfDay(addDays(currentWeekStart, -1));
      const rangeStart = startOfDay(addDays(currentWeekStart, -weeks * 7));
      return {
        start: rangeStart,
        end: rangeEnd,
        label: formatDateRangeLabel(rangeStart, rangeEnd),
      };
    }
    case 'all': {
      if (!earliest) {
        return { start: null, end: null, label: 'Aucune donnée' };
      }
      const rangeStart = startOfDay(earliest);
      return {
        start: rangeStart,
        end: todayEnd,
        label: formatDateRangeLabel(rangeStart, todayEnd),
      };
    }
    case 'custom': {
      const customStart = parseDateInput(params.customStartDate);
      const customEnd = parseDateInput(params.customEndDate);

      if (customStart && customEnd) {
        const rangeStart = startOfDay(customStart);
        const rangeEnd = endOfDay(customEnd);
        return {
          start: rangeStart,
          end: rangeEnd,
          label: formatDateRangeLabel(rangeStart, rangeEnd),
        };
      }

      if (customStart) {
        const rangeStart = startOfDay(customStart);
        return {
          start: rangeStart,
          end: todayEnd,
          label: formatDateRangeLabel(rangeStart, todayEnd),
        };
      }

      if (customEnd) {
        const rangeEnd = endOfDay(customEnd);
        const fallbackStart = earliest ? startOfDay(earliest) : startOfDay(customEnd);
        return {
          start: fallbackStart,
          end: rangeEnd,
          label: formatDateRangeLabel(fallbackStart, rangeEnd),
        };
      }

      if (!earliest) {
        return { start: null, end: null, label: 'Aucune donnée' };
      }

      const rangeStart = startOfDay(earliest);
      return {
        start: rangeStart,
        end: todayEnd,
        label: formatDateRangeLabel(rangeStart, todayEnd),
      };
    }
    default: {
      return { start: null, end: null, label: 'Aucune donnée' };
    }
  }
}

export function isDateInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start && !end) return true;
  if (start && end) return date >= start && date <= end;
  if (start) return date >= start;
  if (end) return date <= end;
  return true;
}

export function filterItemsByRange<T>(
  items: T[],
  getDate: (item: T) => string | null,
  rangeStart: Date | null,
  rangeEnd: Date | null
): T[] {
  return items.filter((item) => {
    const rawDate = getDate(item);
    const parsed = parseDateInput(rawDate);
    if (!parsed) return false;
    return isDateInRange(parsed, rangeStart, rangeEnd);
  });
}

export function isCustomRangeTooShort(start: string, end: string): boolean {
  const startDate = parseDateInput(start);
  const endDate = parseDateInput(end);
  if (!startDate || !endDate) return false;
  const daysDiff = diffDaysInclusive(startDate, endDate);
  return daysDiff < DATE_RANGES.MIN_CUSTOM_RANGE;
}
