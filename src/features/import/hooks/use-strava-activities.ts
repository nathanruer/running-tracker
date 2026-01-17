import { useState, useEffect, useCallback } from 'react';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import { getStravaActivities } from '@/lib/services/api-client';

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  type: string;
  average_heartrate?: number;
  max_heartrate?: number;
}

export function useStravaActivities(open: boolean) {
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { handleError } = useApiErrorHandler();

  const loadActivities = useCallback(async (pageToLoad: number = 1) => {
    if (pageToLoad === 1) {
      setLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const data = await getStravaActivities(pageToLoad, 50);
      
      if (pageToLoad === 1) {
        setActivities(data.activities);
      } else {
        setActivities(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const newActivities = data.activities.filter((a: StravaActivity) => !existingIds.has(a.id));
          return [...prev, ...newActivities];
        });
      }

      setIsConnected(true);
      setHasMore(data.hasMore);
      setPage(pageToLoad);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('400'))) {
        setIsConnected(false);
        setActivities([]);
        setHasMore(false);
      }
      handleError(error, 'Impossible de récupérer les activités Strava');
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, [handleError]);

  const loadMore = useCallback(() => {
    if (!loading && !isFetchingMore && hasMore) {
      loadActivities(page + 1);
    }
  }, [loading, isFetchingMore, hasMore, page, loadActivities]);

  const connectToStrava = () => {
    window.location.href = '/api/auth/strava/authorize';
  };

  useEffect(() => {
    if (open) {
      setActivities([]);
      setIsConnected(false);
      loadActivities();
    }
  }, [open, loadActivities]);

  return {
    activities,
    loading,
    isFetchingMore,
    hasMore,
    isConnected,
    loadActivities,
    loadMore,
    connectToStrava,
  };
}
