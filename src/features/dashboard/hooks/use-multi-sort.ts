'use client';

import { useQueryState, parseAsString } from 'nuqs';
import { useCallback, useMemo } from 'react';
import {
  parseSortParam,
  serializeSortConfig,
  toggleColumnSort,
  getColumnSortInfo,
  type SortColumn,
} from '@/lib/domain/sessions';

export function useMultiSort() {
  const [sortParam, setSortParam] = useQueryState(
    'sort',
    parseAsString.withOptions({
      shallow: false,
      throttleMs: 100,
    })
  );

  const sortConfig = useMemo(() => {
    return parseSortParam(sortParam);
  }, [sortParam]);

  const handleSort = useCallback(
    (column: SortColumn, isMulti: boolean) => {
      const newConfig = toggleColumnSort(sortConfig, column, isMulti);
      const serialized = serializeSortConfig(newConfig);
      setSortParam(serialized || null);
    },
    [sortConfig, setSortParam]
  );

  const clearSort = useCallback(() => {
    setSortParam(null);
  }, [setSortParam]);

  const getColumnInfo = useCallback(
    (column: SortColumn) => {
      return getColumnSortInfo(sortConfig, column);
    },
    [sortConfig]
  );

  return {
    sortConfig,
    sortParam,
    handleSort,
    clearSort,
    getColumnInfo,
  };
}

export type UseMultiSortReturn = ReturnType<typeof useMultiSort>;
