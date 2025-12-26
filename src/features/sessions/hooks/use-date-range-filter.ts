import { useState, useMemo } from 'react';

export type DateRangeType = '2weeks' | '4weeks' | '12weeks' | 'all' | 'custom';

/**
 * Hook for filtering items by date range
 * Provides date range selection and filtering logic with validation for custom ranges
 *
 * @template T Item type that must have an optional date property
 * @param items Array of items to filter
 * @param defaultRange Initial date range selection (default: 'all')
 * @returns Object containing filtered items, date range state, and validation errors
 *
 * @example
 * const { filteredItems, dateRange, setDateRange, dateError } = useDateRangeFilter(sessions);
 */
export function useDateRangeFilter<T extends { date?: string | null }>(
  items: T[],
  defaultRange: DateRangeType = 'all'
) {
  const [dateRange, setDateRange] = useState<DateRangeType>(defaultRange);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  /**
   * Validates custom date range and returns error message if invalid
   */
  const dateError = useMemo(() => {
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate + 'T00:00:00');
      const endDate = new Date(customEndDate + 'T23:59:59');
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 14) {
        return 'La plage doit être d\'au moins 2 semaines (14 jours)';
      }
    }
    return '';
  }, [dateRange, customStartDate, customEndDate]);

  /**
   * Filters items based on selected date range
   */
  const filteredItems = useMemo(() => {
    const now = new Date();

    const itemsWithDate = items.filter((item) => item.date);

    return itemsWithDate.filter((item) => {
      if (!item.date) return false;

      const itemDate = new Date(item.date);

      switch (dateRange) {
        case '2weeks': {
          const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          return itemDate >= twoWeeksAgo;
        }
        case '4weeks': {
          const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
          return itemDate >= fourWeeksAgo;
        }
        case '12weeks': {
          const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
          return itemDate >= twelveWeeksAgo;
        }
        case 'custom': {
          if (!customStartDate && !customEndDate) return true;

          const startDate = customStartDate ? new Date(customStartDate + 'T00:00:00') : null;
          const endDate = customEndDate ? new Date(customEndDate + 'T23:59:59') : null;

          if (startDate && endDate) {
            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff < 14) {
              return false;
            }
            return itemDate >= startDate && itemDate <= endDate;
          } else if (startDate) {
            return itemDate >= startDate;
          } else if (endDate) {
            return itemDate <= endDate;
          }
          return true;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [items, dateRange, customStartDate, customEndDate]);

  /**
   * Resets custom date inputs to empty strings
   */
  const resetCustomDates = () => {
    setCustomStartDate('');
    setCustomEndDate('');
  };

  return {
    dateRange,
    setDateRange,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    filteredItems,
    dateError,
    resetCustomDates,
  };
}
