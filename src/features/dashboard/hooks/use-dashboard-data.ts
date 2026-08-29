import { useMemo, useRef, useState, useCallback } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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
import { queryKeys } from '@/lib/constants/query-keys';

const LIMIT = 10;

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

  const mutations = useEntityMutations({
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
  });

  const sortKey = sortParam || 'default';
  const search = searchQuery?.trim() || '';

  const { data: totalCount = 0, isLoading: totalCountLoading } = useQuery({
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
    isFetching: paginatedSessionsFetching,
    isError: sessionsError,
    refetch: refetchSessions,
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
  const initialLoading = userLoading || isInitialLoad || (totalCountLoading && !uniqueSessions.length);

  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const loadAllCancelledRef = useRef(false);

  const loadAllPages = useCallback(async () => {
    if (!hasNextPage) return;
    setIsLoadingAll(true);
    loadAllCancelledRef.current = false;

    try {
      let result = await fetchNextPage();
      while (result.hasNextPage && !loadAllCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 50));
        result = await fetchNextPage();
      }
    } finally {
      setIsLoadingAll(false);
    }
  }, [hasNextPage, fetchNextPage]);

  const cancelLoadAll = useCallback(() => {
    loadAllCancelledRef.current = true;
  }, []);

  return {
    user,
    userLoading,
    availableTypes,
    sessions: uniqueSessions,
    totalCount,
    initialLoading,
    isFetchingData: paginatedSessionsFetching && !isFetchingNextPage,
    sessionsError,
    refetchSessions,
    hasMore: hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    loadAllPages,
    cancelLoadAll,
    isLoadingAll,
    mutations,
  };
}
