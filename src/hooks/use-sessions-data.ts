import { useQuery, useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { getSessions } from '@/lib/services/api-client';
import type { TrainingSession } from '@/lib/types';

const LIMIT = 10;

/**
 * Hook for managing session data loading with pagination
 * Supports both paginated and 'all' view modes with smart placeholders
 *
 * @param viewMode 'paginated' for infinite scroll, 'all' to load everything
 * @param selectedType Session type filter ('all' or specific type)
 * @param userLoading Whether user data is still loading
 * @param isDeleting Whether a delete operation is in progress
 * @returns Object with session data, loading states, and pagination handlers
 *
 * @example
 * const { sessions, initialLoading, hasMore, loadMore, isFetching } =
 *   useSessionsData(viewMode, selectedType, userLoading, isDeleting);
 */
export function useSessionsData(
  viewMode: 'paginated' | 'all',
  selectedType: string,
  userLoading: boolean,
  isDeleting: boolean = false
) {
  const queryClient = useQueryClient();

  const {
    data: allSessionsData,
    isLoading: allSessionsLoading,
    isFetching: allSessionsFetching,
  } = useQuery({
    queryKey: ['sessions', 'all', selectedType],
    queryFn: () => getSessions(undefined, undefined, selectedType),
    enabled: viewMode === 'all',
    placeholderData: (previousData) => {
      if (previousData) return previousData;

      const paginatedData = queryClient.getQueryData<InfiniteData<TrainingSession[]>>([
        'sessions',
        'paginated',
        selectedType,
      ]);

      if (paginatedData) {
        const lastPage = paginatedData.pages[paginatedData.pages.length - 1];

        if (lastPage && lastPage.length < LIMIT) {
          return paginatedData.pages.flat();
        }
      }

      return undefined;
    },
  });

  const {
    data: paginatedSessionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: paginatedSessionsLoading,
    isFetching: paginatedSessionsFetching,
  } = useInfiniteQuery({
    queryKey: ['sessions', 'paginated', selectedType],
    queryFn: ({ pageParam }) => getSessions(LIMIT, pageParam, selectedType),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    enabled: viewMode === 'paginated',
    placeholderData: (previousData) => previousData,
  });

  const sessions = viewMode === 'all'
    ? (allSessionsData || [])
    : (paginatedSessionsData?.pages.flat() || []);

  const isFetchingData = viewMode === 'all' ? allSessionsFetching : paginatedSessionsFetching;

  const initialLoading = userLoading || (
    !sessions.length && (
      viewMode === 'all'
        ? (allSessionsLoading || allSessionsFetching || isDeleting)
        : (paginatedSessionsLoading || paginatedSessionsFetching || isDeleting)
    )
  );

  const hasMore = viewMode === 'paginated' ? hasNextPage : false;

  const loadMore = () => {
    if (viewMode === 'paginated') {
      fetchNextPage();
    }
  };

  const showGlobalLoading = userLoading || (
    !allSessionsData && !paginatedSessionsData && (allSessionsLoading || paginatedSessionsLoading)
  );

  return {
    sessions,
    initialLoading,
    isFetching: isFetchingData,
    hasMore,
    loadMore,
    isFetchingNextPage,
    showGlobalLoading,
  };
}
