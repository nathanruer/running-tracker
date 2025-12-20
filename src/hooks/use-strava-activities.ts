import { useState, useEffect, useCallback } from 'react';
import { useApiErrorHandler } from './use-api-error-handler';

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
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { handleError } = useApiErrorHandler();

  /**
   * Fetches activities from Strava API
   * Handles connection status and error states
   */
  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/strava/activities');

      if (response.status === 400 || response.status === 401) {
        setIsConnected(false);
        setActivities([]);
      } else if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
        setIsConnected(true);
      } else {
        throw new Error('Échec de la récupération');
      }
    } catch (error) {
      handleError(error, 'Impossible de récupérer les activités Strava');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

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
    isConnected,
    loadActivities,
    connectToStrava,
  };
}
