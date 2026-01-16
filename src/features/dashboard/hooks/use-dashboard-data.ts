import { useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useEntityMutations } from '@/hooks/use-entity-mutations';
import {
  getCurrentUser,
  getSessions,
  getSessionTypes,
  deleteSession,
  bulkDeleteSessions,
} from '@/lib/services/api-client';
import { type TrainingSession } from '@/lib/types';

const LIMIT = 10;

export function useDashboardData(selectedType: string, isShowingAll: boolean, setIsShowingAll: (val: boolean) => void) {
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: availableTypes = [] } = useQuery({
    queryKey: ['sessionTypes'],
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
    relatedQueryKeys: ['sessionTypes'],
    messages: {
      deleteSuccess: 'Séance supprimée',
      deleteSuccessDescription: 'La séance a été supprimée avec succès.',
      bulkDeleteSuccessTitle: 'Séances supprimées',
      bulkDeleteSuccess: (count) => `${count} séance${count > 1 ? 's' : ''} ${count > 1 ? 'ont' : 'a'} été supprimée${count > 1 ? 's' : ''} avec succès.`,
      deleteError: 'Erreur lors de la suppression',
      bulkDeleteError: 'Erreur lors de la suppression groupée',
    },
  });

  const {
    data: allSessionsData,
    isLoading: allSessionsLoading,
  } = useQuery({
    queryKey: ['sessions', 'all', selectedType],
    queryFn: () => getSessions(undefined, undefined, selectedType),
    enabled: !!user && isShowingAll,
    placeholderData: (previousData) => {
      if (previousData) return previousData;
      const paginatedData = queryClient.getQueryData<InfiniteData<TrainingSession[]>>(['sessions', 'paginated', selectedType]);
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
    isFetching: paginatedSessionsFetching
  } = useInfiniteQuery({
    queryKey: ['sessions', 'paginated', selectedType],
    queryFn: ({ pageParam }) => getSessions(LIMIT, pageParam, selectedType),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    enabled: !!user && !isShowingAll,
    placeholderData: (previousData) => previousData,
  });

  const sessions = isShowingAll
    ? (allSessionsData || [])
    : (paginatedSessionsData?.pages.flat() || []);

  const handleResetPagination = () => {
    setIsShowingAll(false);
    queryClient.setQueryData(['sessions', 'paginated', selectedType], (old: InfiniteData<TrainingSession[]> | undefined) => {
      if (!old) return old;
      return {
        pages: [old.pages[0]],
        pageParams: [old.pageParams[0]],
      };
    });
    queryClient.invalidateQueries({ queryKey: ['sessions', 'paginated', selectedType] });
  };

  const initialLoading = userLoading || (!sessions.length && paginatedSessionsLoading);
  const showGlobalLoading = userLoading || (!sessions.length && (allSessionsLoading || paginatedSessionsLoading));

  return {
    user,
    userLoading,
    availableTypes,
    sessions,
    initialLoading,
    showGlobalLoading,
    isFetchingData: paginatedSessionsFetching,
    allSessionsLoading,
    allSessionsData,
    hasMore: hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    handleResetPagination,
    mutations,
  };
}
