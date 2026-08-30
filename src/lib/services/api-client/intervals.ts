import type { IntervalDetails } from '@/lib/types';
import { apiRequest } from './client';

/** An intervals.icu activity as listed for import (session payload fields + import state). */
export interface ImportableActivity {
  date: string;
  startedAt: string | null;
  sessionType: string | null;
  duration: string;
  distance: number;
  avgPace: string;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  perceivedExertion: number | null;
  comments: string;
  externalId: string;
  source: string;
  routePolyline: string | null;
  streams: Record<string, { data: number[] }> | null;
  sourcePayload: unknown;
  elevationGain: number | null;
  averageCadence: number | null;
  calories: number | null;
  alreadyImported: boolean;
  dismissed: boolean;
  /** Other recordings of the same outing, when this activity is the main one. */
  fragmentIds: string[];
  /** Main activity this recording belongs to, when it is itself a fragment. */
  partOf: string | null;
}

export interface ActivitiesResponse {
  activities: ImportableActivity[];
  hasMore: boolean;
  totalCount: number;
  nextCursor: string | null;
}

const IMPORT_TIMEOUT_MS = 120_000;

export interface IntervalsImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export async function getIntervalsActivitiesList(
  options?: { recent?: boolean }
): Promise<ActivitiesResponse> {
  const suffix = options?.recent ? '?recent=1' : '';
  return apiRequest<ActivitiesResponse>(`/api/intervals/activities${suffix}`);
}

export async function importIntervalsSelection(
  externalIds: string[]
): Promise<IntervalsImportResult> {
  return apiRequest<IntervalsImportResult>(
    '/api/intervals/import',
    { method: 'POST', body: JSON.stringify({ externalIds }) },
    IMPORT_TIMEOUT_MS
  );
}

/** Session type and intervals detected by intervals.icu, proposed in the form before saving. */
export interface DetectedSessionStructure {
  sessionType: string | null;
  intervalDetails: IntervalDetails | null;
}

export async function getIntervalsActivityStructure(
  externalId: string
): Promise<DetectedSessionStructure> {
  return apiRequest<DetectedSessionStructure>(
    `/api/intervals/activities/${encodeURIComponent(externalId)}/structure`
  );
}

/** One session rebuilt from several recordings, for review in the form before saving. */
export interface MergedActivity extends Omit<ImportableActivity, 'dismissed' | 'fragmentIds' | 'partOf'> {
  sources: Array<{ externalId: string; startedAt: string | null; sourcePayload: unknown }>;
  intervalDetails: IntervalDetails | null;
}

export async function mergeIntervalsActivities(externalIds: string[]): Promise<MergedActivity> {
  const { activity } = await apiRequest<{ activity: MergedActivity }>('/api/intervals/merge', {
    method: 'POST',
    body: JSON.stringify({ externalIds }),
  });
  return activity;
}

export async function dismissIntervalsActivity(externalId: string, reason?: string): Promise<void> {
  await apiRequest('/api/intervals/dismissed', {
    method: 'POST',
    body: JSON.stringify({ externalId, reason: reason ?? null }),
  });
}

export async function restoreIntervalsActivity(externalId: string): Promise<void> {
  await apiRequest('/api/intervals/dismissed', {
    method: 'DELETE',
    body: JSON.stringify({ externalId }),
  });
}

export interface IntervalsConnectResult {
  athleteId: string;
}

export async function connectIntervalsAccount(apiKey: string): Promise<IntervalsConnectResult> {
  return apiRequest<IntervalsConnectResult>('/api/intervals/account', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
}

export async function disconnectIntervalsAccount(): Promise<void> {
  await apiRequest('/api/intervals/account', { method: 'DELETE' });
}
