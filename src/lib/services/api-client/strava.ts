import { apiRequest } from './client';
import type { StravaActivity } from '@/lib/types';

export interface StravaActivityDetails {
  id: string;
  date: string;
  sessionType: string;
  duration: string;
  distance: number;
  avgPace: string;
  avgHeartRate: number;
  comments: string;
  intervalDetails?: unknown;
}

/**
 * Fetches Strava activities for the current user
 */
export async function getStravaActivities(): Promise<StravaActivity[]> {
  return apiRequest<StravaActivity[]>('/api/strava/activities');
}

/**
 * Fetches detailed information for a specific Strava activity
 * @param activityId Strava activity ID
 */
export async function getStravaActivityDetails(activityId: string): Promise<StravaActivityDetails> {
  return apiRequest<StravaActivityDetails>(`/api/strava/activity/${activityId}`);
}
