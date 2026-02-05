import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { useEntityMutations } from '@/hooks/use-entity-mutations';
import {
  getCurrentUser,
  getSessions,
  getSessionsCount,
  getSessionTypes,
  deleteSession,
  bulkDeleteSessions,
} from '@/lib/services/api-client';
import { type TrainingSession } from '@/lib/types';
import { CACHE_TIME } from '@/lib/constants/time';
import { QUERY_KEYS, queryKeys } from '@/lib/constants/query-keys';
import { compareValues, getClientSortValue, parseSortParam, SORTABLE_COLUMNS } from '@/lib/domain/sessions/sorting';

const LIMIT = 10;

const matchesSessionFilters = (
  session: TrainingSession,
  filters: {
    selectedType?: string;
    search?: string;
    dateFrom?: string;
    userId?: string | null;
  }
) => {
  if (filters.userId && session.userId !== filters.userId) return false;

  const selectedType = filters.selectedType ?? 'all';
  if (selectedType !== 'all' && session.sessionType !== selectedType) return false;

  const search = filters.search?.trim().toLowerCase() ?? '';
  if (search) {
    const comments = session.comments?.toLowerCase() ?? '';
    const sessionType = session.sessionType?.toLowerCase() ?? '';
    if (!comments.includes(search) && !sessionType.includes(search)) return false;
  }

  if (filters.dateFrom && session.status !== 'planned') {
    if (session.date) {
      if (new Date(session.date).getTime() < new Date(filters.dateFrom).getTime()) return false;
    }
  }

  return true;
};

const buildSortFn = (sortParam?: string | null) => {
  const sortConfig = parseSortParam(sortParam ?? null);

  if (!sortConfig.length) {
    return (a: TrainingSession, b: TrainingSession) => {
      const statusCompare = compareValues(a.status ?? null, b.status ?? null, 'desc');
      if (statusCompare !== 0) return statusCompare;
      return compareValues(a.sessionNumber ?? null, b.sessionNumber ?? null, 'desc');
    };
  }

  return (a: TrainingSession, b: TrainingSession) => {
    for (const item of sortConfig) {
      const columnConfig = SORTABLE_COLUMNS[item.column];
      const valueA = getClientSortValue(a, item.column);
      const valueB = getClientSortValue(b, item.column);
      const invertDirection = 'invertDirection' in columnConfig ? !!columnConfig.invertDirection : false;
      const cmp = compareValues(valueA, valueB, item.direction, invertDirection);
      if (cmp !== 0) return cmp;
    }
    return 0;
  };
};

export function useDashboardData(
  selectedType: string,
  sortParam?: string | null,
  searchQuery?: string,
  dateFrom?: string
) {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: queryKeys.user(),
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: availableTypes = [] } = useQuery({
    queryKey: queryKeys.sessionTypes(user?.id),
    queryFn: async () => {
      const types = await getSessionTypes();
      return types.sort();
    },
    staleTime: 15 * 60 * 1000,
  });

  const mutations = useEntityMutations<TrainingSession>({
    baseQueryKey: 'sessions',
    deleteEntity: deleteSession,
    bulkDeleteEntities: async (ids: string[]) => {
      await bulkDeleteSessions(ids);
    },
    relatedQueryKeys: [queryKeys.sessionTypesBase(), queryKeys.sessionsCountBase()],
    messages: {
      bulkDeleteSuccessTitle: 'Séances supprimées',
      bulkDeleteSuccess: (count) => `${count} séance${count > 1 ? 's' : ''} supprimée${count > 1 ? 's' : ''}.`,
    },
    invalidateOnEntitySuccess: false,
    skipRefetchOnDelete: false,
    pageSize: LIMIT,
    sortFn: buildSortFn(sortParam),
    shouldIncludeEntityInQuery: (queryKey: QueryKey, session: TrainingSession) => {
      if (!Array.isArray(queryKey) || queryKey[0] !== QUERY_KEYS.SESSIONS) return true;
      const scope = queryKey[1];

      if (scope === 'all') {
        const userId = queryKey[2] as string | null | undefined;
        return matchesSessionFilters(session, { userId });
      }

      if (scope === 'paginated') {
        const params = queryKey[2] as {
          selectedType?: string;
          search?: string;
          dateFrom?: string;
          userId?: string | null;
        };
        return matchesSessionFilters(session, params ?? {});
      }

      return true;
    },
  });

  const sortKey = sortParam || 'default';
  const search = searchQuery?.trim() || '';

  const { data: totalCount = 0 } = useQuery({
    queryKey: queryKeys.sessionsCount({
      selectedType,
      search,
      dateFrom,
      userId: user?.id ?? null,
    }),
    queryFn: () => getSessionsCount(selectedType, search || undefined, dateFrom),
    enabled: !!user,
    staleTime: CACHE_TIME.SESSIONS,
  });

  const {
    data: paginatedSessionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: paginatedSessionsLoading,
    isFetching: paginatedSessionsFetching
  } = useInfiniteQuery({
    queryKey: queryKeys.sessionsPaginated({
      selectedType,
      sortKey,
      search,
      dateFrom,
      userId: user?.id ?? null,
    }),
    queryFn: ({ pageParam }) => getSessions(
      LIMIT,
      pageParam,
      selectedType,
      sortParam || undefined,
      search || undefined,
      dateFrom,
      undefined,
      'table'
    ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    enabled: !!user,
    staleTime: CACHE_TIME.SESSIONS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });

  const sessions = useMemo(
    () => (paginatedSessionsData?.pages ?? []).flat(),
    [paginatedSessionsData?.pages]
  );
  const uniqueSessions = useMemo(() => {
    if (!sessions.length) return [];
    const map = new Map<string, TrainingSession>();
    for (const session of sessions) {
      map.set(session.id, session);
    }
    return [...map.values()];
  }, [sessions]);

  const isInitialLoad = paginatedSessionsLoading && !uniqueSessions.length;
  const initialLoading = userLoading || isInitialLoad;

  return {
    user,
    userLoading,
    availableTypes,
    sessions: uniqueSessions,
    totalCount,
    initialLoading,
    isFetchingData: paginatedSessionsFetching,
    isFiltering: paginatedSessionsFetching && !!(search || selectedType !== 'all' || dateFrom),
    hasMore: hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    mutations,
  };
}
