import type { TrainingSession, TrainingSessionPayload } from '@/lib/types';
import { apiRequest } from './client';

export async function getSessions(
  limit?: number,
  offset?: number,
  type?: string,
): Promise<TrainingSession[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  if (type && type !== 'all') params.append('type', type);

  const queryString = params.toString() ? `?${params.toString()}` : '';

  const data = await apiRequest<{ sessions: TrainingSession[] }>(
    `/api/sessions${queryString}`,
  );
  return data.sessions;
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
    }
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
