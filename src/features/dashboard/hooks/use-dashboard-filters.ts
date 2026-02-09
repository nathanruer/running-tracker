'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import {
  parseSortParam,
  serializeSortConfig,
  toggleColumnSort,
  getColumnSortInfo,
  type SortColumn,
} from '@/lib/domain/sessions';

export type Period = 'all' | 'week' | 'month' | 'year';

const VALID_PERIODS = new Set<string>(['all', 'week', 'month', 'year']);

function readInitialParams() {
  if (typeof window === 'undefined') return { search: '', type: 'all', period: 'all' as Period, sort: '' };
  const params = new URLSearchParams(window.location.search);
  const period = params.get('period');
  return {
    search: params.get('search') || '',
    type: params.get('type') || 'all',
    period: (period && VALID_PERIODS.has(period) ? period : 'all') as Period,
    sort: params.get('sort') || '',
  };
}

function computeDateFrom(period: Period): string | undefined {
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

function buildSearchParams(search: string, type: string, period: Period, sort: string): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type && type !== 'all') params.set('type', type);
  if (period && period !== 'all') params.set('period', period);
  if (sort) params.set('sort', sort);
  const qs = params.toString();
  return qs ? `?${qs}` : window.location.pathname;
}

export function useDashboardFilters() {
  const [initial] = useState(readInitialParams);
  const [searchQuery, setSearchQuery] = useState(initial.search);
  const [selectedType, setSelectedType] = useState(initial.type);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [sortRaw, setSortRaw] = useState(initial.sort);

  useEffect(() => {
    const url = buildSearchParams(searchQuery, selectedType, period, sortRaw);
    window.history.replaceState(window.history.state, '', url);
  }, [searchQuery, selectedType, period, sortRaw]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleTypeChange = useCallback((type: string) => {
    setSelectedType(type);
  }, []);

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod);
  }, []);

  const dateFrom = useMemo(() => computeDateFrom(period), [period]);

  const sortConfig = useMemo(() => parseSortParam(sortRaw || null), [sortRaw]);
  const sortParam = sortRaw || null;

  const handleSort = useCallback(
    (column: SortColumn, isMulti: boolean) => {
      const newConfig = toggleColumnSort(sortConfig, column, isMulti);
      const serialized = serializeSortConfig(newConfig);
      setSortRaw(serialized);
    },
    [sortConfig]
  );

  const getColumnInfo = useCallback(
    (column: SortColumn) => getColumnSortInfo(sortConfig, column),
    [sortConfig]
  );

  return {
    searchQuery,
    handleSearchChange,
    selectedType,
    handleTypeChange,
    period,
    dateFrom,
    handlePeriodChange,
    sortConfig,
    sortParam,
    handleSort,
    getColumnInfo,
  };
}
