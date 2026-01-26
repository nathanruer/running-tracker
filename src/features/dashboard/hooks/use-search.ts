'use client';

import { useQueryState, parseAsString } from 'nuqs';
import { useCallback } from 'react';

export function useSearch() {
  const [searchQuery, setSearchQuery] = useQueryState(
    'search',
    parseAsString.withOptions({
      shallow: false,
      throttleMs: 300,
    })
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query || null);
    },
    [setSearchQuery]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery(null);
  }, [setSearchQuery]);

  return {
    searchQuery: searchQuery || '',
    handleSearchChange,
    clearSearch,
  };
}

export type UseSearchReturn = ReturnType<typeof useSearch>;
