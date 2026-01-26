'use client';

import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { useCallback, useMemo } from 'react';
import { startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';

export type Period = 'all' | 'week' | 'month' | 'year';

const PERIODS = ['all', 'week', 'month', 'year'] as const;

export function usePeriodFilter() {
  const [period, setPeriod] = useQueryState(
    'period',
    parseAsStringLiteral(PERIODS).withOptions({
      shallow: false,
    })
  );

  const currentPeriod: Period = period || 'all';

  const dateRange = useMemo(() => {
    const now = new Date();

    switch (currentPeriod) {
      case 'week': {
        const start = startOfWeek(now, { weekStartsOn: 1 });
        return { dateFrom: format(start, 'yyyy-MM-dd') };
      }
      case 'month': {
        const start = startOfMonth(now);
        return { dateFrom: format(start, 'yyyy-MM-dd') };
      }
      case 'year': {
        const start = startOfYear(now);
        return { dateFrom: format(start, 'yyyy-MM-dd') };
      }
      case 'all':
      default:
        return {};
    }
  }, [currentPeriod]);

  const handlePeriodChange = useCallback(
    (newPeriod: Period) => {
      setPeriod(newPeriod === 'all' ? null : newPeriod);
    },
    [setPeriod]
  );

  const clearPeriod = useCallback(() => {
    setPeriod(null);
  }, [setPeriod]);

  return {
    period: currentPeriod,
    dateFrom: dateRange.dateFrom,
    handlePeriodChange,
    clearPeriod,
  };
}

export type UsePeriodFilterReturn = ReturnType<typeof usePeriodFilter>;
