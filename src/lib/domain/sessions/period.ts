import { format, startOfMonth, startOfWeek, startOfYear } from 'date-fns';

export type Period = 'all' | 'week' | 'month' | 'year';

export const VALID_PERIODS = new Set<string>(['all', 'week', 'month', 'year']);

export function computeDateFrom(period: Period): string | undefined {
  const now = new Date();
  switch (period) {
    case 'week':
      return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(now), 'yyyy-MM-dd');
    case 'year':
      return format(startOfYear(now), 'yyyy-MM-dd');
    default:
      return undefined;
  }
}
