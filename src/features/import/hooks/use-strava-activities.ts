import { useState, useEffect, useCallback } from 'react';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { getStravaActivities, type FormattedStravaActivity } from '@/lib/services/api-client';

export type { FormattedStravaActivity };

export function useStravaActivities(open: boolean) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activities, setActivities] = useState<FormattedStravaActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const { handleError } = useErrorHandler({ scope: 'local' });

  const loadActivities = useCallback(async (pageNum: number, perPage: number = 20) => {
    const isFirst = pageNum === 1;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await getStravaActivities(pageNum, perPage);

      if (isFirst) {
        setActivities(data.activities);
      } else {
        setActivities((prev) => {
          const ids = new Set(prev.map((a) => a.externalId));
          return [...prev, ...data.activities.filter((a) => !ids.has(a.externalId))];
        });
      }

      setHasMore(data.hasMore);
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
    if (!loading && !loadingMore && hasMore) {
      loadActivities(page + 1, 20);
    }
  }, [loading, loadingMore, hasMore, page, loadActivities]);

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
  }, [open, loadActivities]);

  return {
    activities,
    loading,
    loadingMore,
    hasMore,
    isConnected,
    loadMore,
    connectToStrava,
  };
}
