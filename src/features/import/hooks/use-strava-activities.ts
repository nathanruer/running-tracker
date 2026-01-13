import { useState, useEffect, useCallback } from 'react';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';

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

/**
 * Hook for fetching and managing Strava activities
 * Handles loading state, connection status, and activity fetching
 *
 * @param open Dialog open state - triggers fetch when opened
 * @returns Object with activities, loading state, connection status, and utility functions
 *
 * @example
 * const { activities, loading, isConnected, loadActivities, connectToStrava } = useStravaActivities(open);
 *
 * if (!isConnected) {
 *   return <Button onClick={connectToStrava}>Connect to Strava</Button>;
 * }
 */
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
      const response = await fetch(`/api/strava/activities?page=${pageToLoad}&per_page=50`);

      if (response.status === 400 || response.status === 401) {
        setIsConnected(false);
        setActivities([]);
        setHasMore(false);
      } else if (response.ok) {
        const data = await response.json();
        
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
      } else {
        throw new Error('Échec de la récupération');
      }
    } catch (error) {
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
