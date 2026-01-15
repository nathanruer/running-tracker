import { apiRequest } from './client';
import type { StravaActivity, StravaActivity as StravaActivityEntity, IntervalDetails } from '@/lib/types';

export interface StravaActivityDetails {
  id: string;
  date: string;
  sessionType: string;
  duration: string;
  distance: number;
  avgPace: string;
  avgHeartRate: number | null;
  comments: string;
  intervalDetails?: IntervalDetails | null;
  externalId?: string;
  source?: string;
  stravaData?: StravaActivityEntity | null;
  elevationGain?: number | null;
  averageCadence?: number | null;
  averageTemp?: number | null;
  calories?: number | null;
}

/**
 * Fetches Strava activities for the current user with pagination support
 */
export async function getStravaActivities(page: number = 1, perPage: number = 50): Promise<{ activities: StravaActivity[], hasMore: boolean }> {
  return apiRequest<{ activities: StravaActivity[], hasMore: boolean }>(`/api/strava/activities?page=${page}&per_page=${perPage}`);
}

/**
 * Fetches detailed information for a specific Strava activity
 * @param activityId Strava activity ID
 */
export async function getStravaActivityDetails(activityId: string): Promise<StravaActivityDetails> {
  return apiRequest<StravaActivityDetails>(`/api/strava/activities/${activityId}`);
}
