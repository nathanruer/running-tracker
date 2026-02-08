import { useState, useCallback, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { getStravaActivities, type FormattedStravaActivity } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';
import { CACHE_TIME } from '@/lib/constants/time';

export type { FormattedStravaActivity };

export interface SearchProgress {
  loaded: number;
  total: number;
}

const PAGE_SIZE = 30;

function isAuthError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
  return errorMessage.includes('non connecté') ||
         errorMessage.includes('401') ||
         errorMessage.includes('400') ||
         errorMessage.includes('unauthorized');
}

export function useStravaActivities(open: boolean) {
  const [searchLoading, setSearchLoading] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [searchProgress, setSearchProgress] = useState<SearchProgress>({ loaded: 0, total: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const { handleError } = useErrorHandler({ scope: 'local' });
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.stravaActivities(),
    queryFn: async ({ pageParam }) => {
      return await getStravaActivities(PAGE_SIZE, pageParam);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor ?? undefined;
    },
    enabled: open,
    staleTime: 0, // SWR: always refetch in background, show cache instantly
    gcTime: CACHE_TIME.STRAVA_ACTIVITIES, // Keep cache for instant display
    retry: (failureCount, err) => {
      if (isAuthError(err)) return false;
      return failureCount < 1;
    },
  });

  const isConnected = !isError || !isAuthError(error);
  const activities = data?.pages.flatMap(page => page.activities) ?? [];
  const uniqueActivities = [...new Map(activities.map(a => [a.externalId, a])).values()];
  const totalCount = data?.pages[0]?.totalCount;
  const hasMore = hasNextPage ?? false;

  const loadMore = useCallback(() => {
    if (!isLoading && !isFetchingNextPage && hasMore) {
      fetchNextPage();
    }
  }, [isLoading, isFetchingNextPage, hasMore, fetchNextPage]);

  const loadAllForSearch = useCallback(async (searchQuery: string) => {
    if (!hasMore || searchLoading || isLoadingAll) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setSearchLoading(true);
    const lowerQuery = searchQuery.toLowerCase();

    setSearchProgress({ loaded: uniqueActivities.length, total: totalCount || 0 });

    try {
      let currentHasMore: boolean = hasMore;

      while (currentHasMore) {
        if (abortControllerRef.current?.signal.aborted) break;

        const result = await fetchNextPage();

        if (result.data) {
          const allActivities = result.data.pages.flatMap(page => page.activities);
          const lastPage = result.data.pages[result.data.pages.length - 1];

          setSearchProgress({
            loaded: allActivities.length,
            total: totalCount || allActivities.length
          });

          const matchesFound = lastPage.activities.some((a) =>
            a.comments.toLowerCase().includes(lowerQuery)
          );

          currentHasMore = Boolean(lastPage.hasMore);

          if (matchesFound) break;
        } else {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        handleError(err);
      }
    } finally {
      setSearchLoading(false);
    }
  }, [hasMore, searchLoading, isLoadingAll, uniqueActivities.length, totalCount, fetchNextPage, handleError]);

  const loadAllActivities = useCallback(async () => {
    if (isLoadingAll || searchLoading) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoadingAll(true);

    setSearchProgress({ loaded: uniqueActivities.length, total: totalCount || 0 });

    try {
      let currentHasMore: boolean = hasMore;

      while (currentHasMore) {
        if (abortControllerRef.current?.signal.aborted) break;

        const result = await fetchNextPage();

        if (result.data) {
          const allActivities = result.data.pages.flatMap(page => page.activities);
          const lastPage = result.data.pages[result.data.pages.length - 1];

          setSearchProgress({
            loaded: allActivities.length,
            total: totalCount || allActivities.length
          });

          currentHasMore = Boolean(lastPage.hasMore);
        } else {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        handleError(err);
      }
    } finally {
      setIsLoadingAll(false);
    }
  }, [isLoadingAll, searchLoading, hasMore, uniqueActivities.length, totalCount, fetchNextPage, handleError]);

  const cancelLoading = useCallback(() => {
    abortControllerRef.current?.abort();
    setSearchLoading(false);
    setIsLoadingAll(false);
  }, []);

  const refresh = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.stravaActivities() });
    setSearchLoading(false);
    setIsLoadingAll(false);
    refetch();
  }, [queryClient, refetch]);

  const connectToStrava = () => {
    window.location.href = '/api/auth/strava/authorize';
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    activities: uniqueActivities,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    hasMore,
    isConnected,
    loadMore,
    connectToStrava,
    totalCount,
    searchLoading,
    isLoadingAll,
    searchProgress,
    loadAllForSearch,
    loadAllActivities,
    cancelLoading,
    refresh,
  };
}
