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
  nextCursor?: number | null;
}

export async function getStravaActivities(perPage: number = 30, before?: number): Promise<StravaActivitiesResponse> {
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (before) params.set('before', String(before));
  return apiRequest<StravaActivitiesResponse>(`/api/strava/activities?${params}`);
}

export async function getStravaActivityDetails(activityId: string): Promise<FormattedStravaActivity> {
  return apiRequest<FormattedStravaActivity>(`/api/strava/activities/${activityId}`);
}

export async function getImportedStravaIds(): Promise<string[]> {
  return apiRequest<string[]>('/api/sessions/strava-ids');
}
