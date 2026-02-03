'use client';

import { useQueryState, parseAsString } from 'nuqs';
import { useCallback } from 'react';

export function useTypeFilter() {
  const [type, setType] = useQueryState(
    'type',
    parseAsString.withOptions({
      shallow: false,
    })
  );

  const selectedType = type || 'all';

  const handleTypeChange = useCallback(
    (newType: string) => {
      setType(newType === 'all' ? null : newType);
    },
    [setType]
  );

  const clearType = useCallback(() => {
    setType(null);
  }, [setType]);

  return {
    selectedType,
    handleTypeChange,
    clearType,
  };
}

export type UseTypeFilterReturn = ReturnType<typeof useTypeFilter>;
