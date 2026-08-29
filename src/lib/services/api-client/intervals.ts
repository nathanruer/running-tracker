import { apiRequest } from './client';
import type { StravaActivitiesResponse } from './strava';

const IMPORT_TIMEOUT_MS = 120_000;

export interface IntervalsImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export async function getIntervalsActivitiesList(
  options?: { recent?: boolean }
): Promise<StravaActivitiesResponse> {
  const suffix = options?.recent ? '?recent=1' : '';
  return apiRequest<StravaActivitiesResponse>(`/api/intervals/activities${suffix}`);
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
