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
