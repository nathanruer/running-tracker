import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT, DELETE } from '../route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { findSessionByIdAndUser } from '@/lib/utils/api';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/api')>();
  return {
    ...actual,
    findSessionByIdAndUser: vi.fn(),
  };
});

vi.mock('@/lib/domain/sessions', () => ({
  recalculateSessionNumbers: vi.fn(),
}));

const createRequest = (method: string, body?: object) => {
  return new NextRequest('http://localhost/api/sessions/session-123', {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
};

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('/api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT', () => {
    it('updates session successfully', async () => {
      const existingSession = { id: 'session-123', userId: 'user-123', distance: 10 };
      const updates = { distance: 15, sessionType: 'Footing long' };
      const updatedSession = { ...existingSession, ...updates };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);

      const response = await PUT(createRequest('PUT', updates), createParams('session-123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toEqual(updatedSession);
      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({ distance: 15, sessionType: 'Footing long' }),
      });
    });

    it('returns 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const response = await PUT(createRequest('PUT', { distance: 15 }), createParams('session-123'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non authentifié');
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('returns 404 when session not found', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

      const response = await PUT(createRequest('PUT', { distance: 15 }), createParams('session-123'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Séance introuvable');
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('prevents access to another user session', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-456');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

      const response = await PUT(createRequest('PUT', { distance: 15 }), createParams('session-123'));

      expect(response.status).toBe(404);
      expect(findSessionByIdAndUser).toHaveBeenCalledWith('session-123', 'user-456');
    });

    it('recalculates session numbers when date is updated', async () => {
      const existingSession = { id: 'session-123', userId: 'user-123', date: '2025-12-25' };
      const updatedSession = { ...existingSession, date: new Date('2025-12-27') };
      const refreshedSession = { ...updatedSession, sessionNumber: 10 };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(refreshedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const response = await PUT(createRequest('PUT', { date: '2025-12-27' }), createParams('session-123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session.id).toBe('session-123');
      expect(data.session.sessionNumber).toBe(10);
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('sets date to null when empty string provided', async () => {
      const existingSession = { id: 'session-123', userId: 'user-123', date: '2025-12-25' };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue({ ...existingSession, date: null } as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue({ ...existingSession, date: null } as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      await PUT(createRequest('PUT', { date: '' }), createParams('session-123'));

      expect(prisma.training_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ date: null }),
        })
      );
    });

    it('handles interval details update', async () => {
      const existingSession = { id: 'session-123', userId: 'user-123' };
      const intervalDetails = {
        workoutType: 'interval',
        repetitionCount: 5,
        effortDuration: null,
        recoveryDuration: null,
        effortDistance: null,
        targetEffortPace: null,
        targetEffortHR: null,
        targetRecoveryPace: null,
        steps: [],
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue({ ...existingSession, intervalDetails } as never);

      await PUT(createRequest('PUT', { intervalDetails }), createParams('session-123'));

      expect(prisma.training_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ intervalDetails }),
        })
      );
    });

    it('handles weather update and sets averageTemp from weather', async () => {
      const existingSession = { id: 'session-123', userId: 'user-123' };
      const weather = {
        conditionCode: 1,
        temperature: 18,
        windSpeed: 5,
        precipitation: 0,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue({ ...existingSession, weather, averageTemp: 18 } as never);

      await PUT(createRequest('PUT', { weather }), createParams('session-123'));

      expect(prisma.training_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ weather, averageTemp: 18 }),
        })
      );
    });

    it('handles strava data update', async () => {
      const existingSession = { id: 'session-123', userId: 'user-123' };
      const stravaData = {
        id: 12345,
        name: 'Morning Run',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1900,
        total_elevation_gain: 50,
        type: 'Run',
        start_date: '2025-01-01T08:00:00Z',
        start_date_local: '2025-01-01T09:00:00',
        average_speed: 2.78,
        max_speed: 3.5,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue({ ...existingSession, stravaData } as never);

      await PUT(createRequest('PUT', { stravaData }), createParams('session-123'));

      expect(prisma.training_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stravaData }),
        })
      );
    });
  });

  describe('DELETE', () => {
    it('deletes session successfully', async () => {
      const existingSession = { id: 'session-123', userId: 'user-123' };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.delete).mockResolvedValue(existingSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const response = await DELETE(createRequest('DELETE'), createParams('session-123'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Séance supprimée');
      expect(prisma.training_sessions.delete).toHaveBeenCalledWith({ where: { id: 'session-123' } });
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('returns 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const response = await DELETE(createRequest('DELETE'), createParams('session-123'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non authentifié');
      expect(prisma.training_sessions.delete).not.toHaveBeenCalled();
    });

    it('returns 404 when session not found', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

      const response = await DELETE(createRequest('DELETE'), createParams('session-123'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Séance introuvable');
      expect(prisma.training_sessions.delete).not.toHaveBeenCalled();
    });

    it('prevents deletion of another user session', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-456');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

      const response = await DELETE(createRequest('DELETE'), createParams('session-123'));

      expect(response.status).toBe(404);
      expect(findSessionByIdAndUser).toHaveBeenCalledWith('session-123', 'user-456');
      expect(prisma.training_sessions.delete).not.toHaveBeenCalled();
    });
  });
});
