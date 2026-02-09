import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSessions,
  getSessionsCount,
  addSession,
  updateSession,
  deleteSession,
  bulkImportSessions,
  bulkDeleteSessions,
  getSessionTypes,
  addPlannedSession,
  completeSession,
} from '@/lib/services/api-client/sessions';
import * as clientModule from '@/lib/services/api-client/client';

vi.mock('@/lib/services/api-client/client', () => ({
  apiRequest: vi.fn(),
}));

describe('Sessions API', () => {
  const mockApiRequest = vi.mocked(clientModule.apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSessions', () => {
    it('fetches sessions without parameters', async () => {
      const mockSessions = [{ id: '1', sessionType: 'Footing' }];
      mockApiRequest.mockResolvedValue({ sessions: mockSessions });

      const result = await getSessions();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions');
      expect(result).toEqual(mockSessions);
    });

    it('fetches sessions with limit and offset', async () => {
      mockApiRequest.mockResolvedValue({ sessions: [] });

      await getSessions(10, 20);

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions?limit=10&offset=20');
    });

    it('fetches sessions with type filter', async () => {
      mockApiRequest.mockResolvedValue({ sessions: [] });

      await getSessions(undefined, undefined, 'Footing');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions?type=Footing');
    });

    it('ignores type filter when set to "all"', async () => {
      mockApiRequest.mockResolvedValue({ sessions: [] });

      await getSessions(undefined, undefined, 'all');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions');
    });

    it('combines all parameters', async () => {
      mockApiRequest.mockResolvedValue({ sessions: [] });

      await getSessions(5, 10, 'Fractionné');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions?limit=5&offset=10&type=Fractionn%C3%A9');
    });

    it('includes sort, search and dateFrom', async () => {
      mockApiRequest.mockResolvedValue({ sessions: [] });

      await getSessions(10, 0, 'all', 'date:asc', 'test', '2024-01-01');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions?limit=10&sort=date%3Aasc&search=test&dateFrom=2024-01-01');
    });

    it('includes view parameter', async () => {
      mockApiRequest.mockResolvedValue({ sessions: [] });

      await getSessions(undefined, undefined, 'all', undefined, undefined, undefined, undefined, 'table');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions?view=table');
    });

    it('includes export view parameter', async () => {
      mockApiRequest.mockResolvedValue({ sessions: [] });

      await getSessions(undefined, undefined, 'all', undefined, undefined, undefined, undefined, 'export');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions?view=export');
    });
  });

  describe('getSessionsCount', () => {
    it('fetches count without filters', async () => {
      mockApiRequest.mockResolvedValue({ count: 4 });

      const result = await getSessionsCount();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/count');
      expect(result).toBe(4);
    });

    it('fetches count with filters', async () => {
      mockApiRequest.mockResolvedValue({ count: 2 });

      const result = await getSessionsCount('Footing', 'test', '2024-01-01');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/count?type=Footing&search=test&dateFrom=2024-01-01');
      expect(result).toBe(2);
    });
  });

  describe('addSession', () => {
    it('creates a new session', async () => {
      const newSession = {
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '1:00:00',
        distance: 10,
        avgPace: '6:00',
        avgHeartRate: 140,
        comments: 'Test session',
      };
      const createdSession = { id: '123', ...newSession };
      mockApiRequest.mockResolvedValue({ session: createdSession });

      const result = await addSession(newSession);

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(newSession),
      });
      expect(result).toEqual(createdSession);
    });
  });

  describe('updateSession', () => {
    it('updates an existing session', async () => {
      const updates = { distance: 15 };
      const updatedSession = { id: '123', distance: 15 };
      mockApiRequest.mockResolvedValue({ session: updatedSession });

      const result = await updateSession('123', updates);

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/123', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      expect(result).toEqual(updatedSession);
    });
  });

  describe('deleteSession', () => {
    it('deletes a session', async () => {
      mockApiRequest.mockResolvedValue({});

      await deleteSession('123');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/123', {
        method: 'DELETE',
      });
    });
  });

  describe('bulkImportSessions', () => {
    it('imports multiple sessions', async () => {
      const sessions = [
        { date: '2024-01-15', sessionType: 'Footing', duration: '1:00:00', distance: 10, avgPace: '6:00', avgHeartRate: 140, comments: '' },
        { date: '2024-01-16', sessionType: 'Fractionné', duration: '0:45:00', distance: 8, avgPace: '5:30', avgHeartRate: 160, comments: '' },
      ];
      mockApiRequest.mockResolvedValue({ count: 2, message: '2 séances importées' });

      const result = await bulkImportSessions(sessions);

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions }),
      }, 120_000);
      expect(result).toEqual({ count: 2, message: '2 séances importées' });
    });
  });

  describe('bulkDeleteSessions', () => {
    it('deletes multiple sessions', async () => {
      mockApiRequest.mockResolvedValue({ count: 2, message: '2 séances supprimées' });

      const result = await bulkDeleteSessions(['a', 'b']);

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['a', 'b'] }),
      });
      expect(result).toEqual({ count: 2, message: '2 séances supprimées' });
    });
  });

  describe('getSessionTypes', () => {
    it('fetches available session types', async () => {
      const types = ['Footing', 'Fractionné', 'Sortie longue'];
      mockApiRequest.mockResolvedValue({ types });

      const result = await getSessionTypes();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/types');
      expect(result).toEqual(types);
    });
  });

  describe('addPlannedSession', () => {
    it('creates a planned session', async () => {
      const payload = { date: '2024-01-15', sessionType: 'Footing' };
      mockApiRequest.mockResolvedValue({ session: { id: 'p1', ...payload } });

      const result = await addPlannedSession(payload);

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/planned', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual({ id: 'p1', ...payload });
    });
  });

  describe('completeSession', () => {
    it('completes a session', async () => {
      const payload = { date: '2024-01-15', sessionType: 'Footing' };
      mockApiRequest.mockResolvedValue({ id: 'c1', ...payload });

      const result = await completeSession('c1', payload as never);

      expect(mockApiRequest).toHaveBeenCalledWith('/api/sessions/c1/complete', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual({ id: 'c1', ...payload });
    });
  });
});
