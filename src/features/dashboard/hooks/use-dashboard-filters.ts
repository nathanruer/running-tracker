'use client';

import { computeDateFrom, VALID_PERIODS, type Period } from '@/lib/domain/sessions/period';
export type { Period };

import { useCallback, useMemo } from 'react';
import { startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import {
  parseSortParam,
  serializeSortConfig,
  toggleColumnSort,
  getColumnSortInfo,
  type SortColumn,
} from '@/lib/domain/sessions';
import { useUrlParams } from '@/hooks/use-url-params';



function validatePeriod(raw: string): Period | null {
  return VALID_PERIODS.has(raw) ? (raw as Period) : null;
}

export function useDashboardFilters() {
  const { params, setParam } = useUrlParams({
    search: { key: 'search', defaultValue: '' },
    type: { key: 'type', defaultValue: 'all' },
    period: { key: 'period', defaultValue: 'all' as Period, validate: validatePeriod },
    sort: { key: 'sort', defaultValue: '' },
  });

  const handleSearchChange = useCallback((query: string) => {
    setParam('search', query);
  }, [setParam]);

  const handleTypeChange = useCallback((type: string) => {
    setParam('type', type);
  }, [setParam]);

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setParam('period', newPeriod);
  }, [setParam]);

  const dateFrom = useMemo(() => computeDateFrom(params.period), [params.period]);

  const sortConfig = useMemo(() => parseSortParam(params.sort || null), [params.sort]);
  const sortParam = params.sort || null;

  const handleSort = useCallback(
    (column: SortColumn, isMulti: boolean) => {
      const newConfig = toggleColumnSort(sortConfig, column, isMulti);
      const serialized = serializeSortConfig(newConfig);
      setParam('sort', serialized);
    },
    [sortConfig, setParam]
  );

  const getColumnInfo = useCallback(
    (column: SortColumn) => getColumnSortInfo(sortConfig, column),
    [sortConfig]
  );

  return {
    searchQuery: params.search,
    handleSearchChange,
    selectedType: params.type,
    handleTypeChange,
    period: params.period,
    dateFrom,
    handlePeriodChange,
    sortConfig,
    sortParam,
    handleSort,
    getColumnInfo,
  };
}
