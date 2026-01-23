import { useState, useEffect, useCallback } from 'react';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { getStravaActivities, type FormattedStravaActivity } from '@/lib/services/api-client';

export type { FormattedStravaActivity };

export function useStravaActivities(open: boolean) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [activities, setActivities] = useState<FormattedStravaActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const { handleError } = useErrorHandler({ scope: 'local' });

  const loadActivities = useCallback(async (pageNum: number, perPage: number = 20) => {
    const isFirst = pageNum === 1;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await getStravaActivities(pageNum, perPage);

      const nextActivities = isFirst
        ? data.activities
        : await new Promise<FormattedStravaActivity[]>((resolve) => {
            setActivities((prev) => {
              const ids = new Set(prev.map((a) => a.externalId));
              const merged = [...prev, ...data.activities.filter((a) => !ids.has(a.externalId))];
              resolve(merged);
              return merged;
            });
          });

      if (isFirst) {
        setActivities(data.activities);
      }

      if (data.totalCount !== undefined) {
        setTotalCount(data.totalCount);
      }

      setTotalCount((currentTotal) => {
        const reachedTotal = currentTotal !== null && nextActivities.length >= currentTotal;
        setHasMore(data.hasMore && !reachedTotal);
        return currentTotal;
      });

      setIsConnected(true);
      setPage(pageNum);
      return data.hasMore;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      const isAuthError = errorMessage.includes('non connecté') || 
                          errorMessage.includes('401') || 
                          errorMessage.includes('400') ||
                          errorMessage.includes('unauthorized');
      
      if (isAuthError) {
        setIsConnected(false);
      } else {
        handleError(error);
      }
      return false;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [handleError]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && !loadingAll && hasMore) {
      loadActivities(page + 1, 20);
    }
  }, [loading, loadingMore, loadingAll, hasMore, page, loadActivities]);

  const loadAll = useCallback(async () => {
    if (loading || loadingMore || loadingAll || !hasMore) return;

    setLoadingAll(true);
    
    let currentPage = 1;
    let moreAvailable = true;

    while (moreAvailable) {
      moreAvailable = await loadActivities(currentPage, 200) ?? false;
      currentPage += 1;
    }

    setLoadingAll(false);
  }, [loading, loadingMore, loadingAll, hasMore, loadActivities]);
  const reset = useCallback(() => {
    loadActivities(1, 20);
  }, [loadActivities]);

  const connectToStrava = () => {
    window.location.href = '/api/auth/strava/authorize';
  };

  useEffect(() => {
    if (open) {
      setActivities([]);
      setIsConnected(false);
      setPage(1);
      setHasMore(false);
      loadActivities(1, 20);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return {
    activities,
    loading,
    loadingMore,
    loadingAll,
    hasMore,
    totalCount,
    isConnected,
    loadMore,
    loadAll,
    reset,
    connectToStrava,
  };
}
