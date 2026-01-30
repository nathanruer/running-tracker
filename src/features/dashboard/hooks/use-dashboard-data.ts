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

const LIMIT = 10;

export function useDashboardData(
  selectedType: string,
  sortParam?: string | null,
  searchQuery?: string,
  dateFrom?: string
) {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: availableTypes = [] } = useQuery({
    queryKey: ['sessionTypes', user?.id],
    queryFn: async () => {
      const types = await getSessionTypes();
      return types.sort();
    },
    staleTime: 15 * 60 * 1000,
  });

  const mutations = useEntityMutations<TrainingSession>({
    baseQueryKey: 'sessions',
    filterType: selectedType,
    deleteEntity: deleteSession,
    bulkDeleteEntities: async (ids: string[]) => {
      await bulkDeleteSessions(ids);
    },
    relatedQueryKeys: ['sessionTypes', 'sessionsCount'],
    messages: {
      bulkDeleteSuccessTitle: 'Séances supprimées',
      bulkDeleteSuccess: (count) => `${count} séance${count > 1 ? 's' : ''} supprimée${count > 1 ? 's' : ''}.`,
    },
  });

  const sortKey = sortParam || 'default';
  const search = searchQuery?.trim() || '';

  const { data: totalCount = 0 } = useQuery({
    queryKey: ['sessionsCount', selectedType, search, dateFrom, user?.id],
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
    queryKey: ['sessions', 'paginated', selectedType, sortKey, search, dateFrom, user?.id],
    queryFn: ({ pageParam }) => getSessions(LIMIT, pageParam, selectedType, sortParam || undefined, search || undefined, dateFrom),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    enabled: !!user,
    staleTime: CACHE_TIME.SESSIONS,
    placeholderData: (previousData) => previousData,
  });

  const sessions = paginatedSessionsData?.pages.flat() || [];
  const uniqueSessions = [...new Map(sessions.map(s => [s.id, s])).values()];

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
