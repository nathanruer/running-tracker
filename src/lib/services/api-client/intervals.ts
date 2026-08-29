import { apiRequest } from './client';
import type { StravaActivitiesResponse } from './strava';

const IMPORT_TIMEOUT_MS = 120_000;

export interface IntervalsImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export async function importFromIntervals(): Promise<IntervalsImportResult> {
  return apiRequest<IntervalsImportResult>(
    '/api/intervals/import',
    { method: 'POST' },
    IMPORT_TIMEOUT_MS
  );
}

export async function getIntervalsActivitiesList(): Promise<StravaActivitiesResponse> {
  return apiRequest<StravaActivitiesResponse>('/api/intervals/activities');
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
