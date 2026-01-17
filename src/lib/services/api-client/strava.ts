import { apiRequest } from './client';
import type { StravaActivity as StravaActivityEntity, IntervalDetails } from '@/lib/types';

export interface FormattedStravaActivity {
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

export interface StravaActivitiesResponse {
  activities: FormattedStravaActivity[];
  hasMore: boolean;
  totalCount?: number;
}

export async function getStravaActivities(page: number = 1, perPage: number = 20): Promise<StravaActivitiesResponse> {
  return apiRequest<StravaActivitiesResponse>(`/api/strava/activities?page=${page}&per_page=${perPage}`);
}

export async function getStravaActivityDetails(activityId: string): Promise<FormattedStravaActivity> {
  return apiRequest<FormattedStravaActivity>(`/api/strava/activities/${activityId}`);
}

export async function getImportedStravaIds(): Promise<string[]> {
  return apiRequest<string[]>('/api/sessions/strava-ids');
}
