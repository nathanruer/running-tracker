import type { TrainingSession, TrainingSessionPayload, WeatherData } from '@/lib/types';
import { apiRequest } from './client';

export type WeatherEnrichmentStatus =
  | 'updated'
  | 'enriched'
  | 'already_has_weather'
  | 'missing_strava'
  | 'missing_date'
  | 'failed'
  | 'not_found';

export interface WeatherEnrichmentResponse {
  status: WeatherEnrichmentStatus;
  session?: TrainingSession | { id: string; weather?: WeatherData | null };
  weather?: WeatherData | null;
  message?: string;
}

export interface BulkWeatherEnrichmentSummary {
  requested: number;
  enriched: number;
  alreadyHasWeather: number;
  missingStrava: number;
  failed: number;
  notFound: number;
}

export interface BulkWeatherEnrichmentResponse {
  summary: BulkWeatherEnrichmentSummary;
  ids: {
    enriched: string[];
    alreadyHasWeather: string[];
    missingStrava: string[];
    failed: string[];
    notFound: string[];
  };
}

export async function getSessions(
  limit?: number,
  offset?: number,
  type?: string,
  sort?: string,
  search?: string,
  dateFrom?: string,
  context?: 'analytics',
  view?: 'table' | 'full' | 'export',
): Promise<TrainingSession[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  if (type && type !== 'all') params.append('type', type);
  if (sort) params.append('sort', sort);
  if (search) params.append('search', search);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (context) params.append('context', context);
  if (view && view !== 'full') params.append('view', view);

  const queryString = params.toString() ? `?${params.toString()}` : '';

  const data = await apiRequest<{ sessions: TrainingSession[] }>(
    `/api/sessions${queryString}`,
  );
  return data.sessions;
}

export async function getSessionById(id: string): Promise<TrainingSession> {
  const data = await apiRequest<{ session: TrainingSession }>(
    `/api/sessions/${id}`,
  );
  return data.session;
}

export async function getSessionsCount(
  type?: string,
  search?: string,
  dateFrom?: string,
): Promise<number> {
  const params = new URLSearchParams();
  if (type && type !== 'all') params.append('type', type);
  if (search) params.append('search', search);
  if (dateFrom) params.append('dateFrom', dateFrom);

  const queryString = params.toString() ? `?${params.toString()}` : '';

  const data = await apiRequest<{ count: number }>(
    `/api/sessions/count${queryString}`,
  );
  return data.count;
}

export async function addSession(
  session: TrainingSessionPayload,
): Promise<TrainingSession> {
  const data = await apiRequest<{ session: TrainingSession }>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });

  return data.session;
}

export async function updateSession(
  id: string,
  updates: Partial<TrainingSessionPayload>,
): Promise<TrainingSession> {
  const data = await apiRequest<{ session: TrainingSession }>(
    `/api/sessions/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    },
  );

  return data.session;
}

export async function deleteSession(id: string): Promise<void> {
  await apiRequest(`/api/sessions/${id}`, {
    method: 'DELETE',
  });
}

export async function bulkImportSessions(
  sessions: TrainingSessionPayload[],
): Promise<{ count: number; message: string }> {
  const data = await apiRequest<{ count: number; message: string }>(
    '/api/sessions/bulk',
    {
      method: 'POST',
      body: JSON.stringify({ sessions }),
    },
    120_000,
  );

  return data;
}

export async function bulkDeleteSessions(
  ids: string[],
): Promise<{ count: number; message: string }> {
  const data = await apiRequest<{ count: number; message: string }>(
    '/api/sessions/bulk',
    {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }
  );

  return data;
}

export async function enrichSessionWeather(
  id: string
): Promise<WeatherEnrichmentResponse> {
  return apiRequest<WeatherEnrichmentResponse>(`/api/sessions/${id}/weather`, {
    method: 'PATCH',
  });
}

export async function bulkEnrichSessionWeather(
  ids: string[]
): Promise<BulkWeatherEnrichmentResponse> {
  return apiRequest<BulkWeatherEnrichmentResponse>('/api/sessions/weather/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export async function getSessionTypes(): Promise<string[]> {
  const data = await apiRequest<{ types: string[] }>('/api/sessions/types');
  return data.types;
}

export async function addPlannedSession(
  session: Record<string, unknown>,
): Promise<TrainingSession> {
  const data = await apiRequest<{ session: TrainingSession }>('/api/sessions/planned', {
    method: 'POST',
    body: JSON.stringify(session),
  });

  return data.session;
}

export async function completeSession(
  id: string,
  session: TrainingSessionPayload,
): Promise<TrainingSession> {
  return apiRequest<TrainingSession>(`/api/sessions/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(session),
  });
}
