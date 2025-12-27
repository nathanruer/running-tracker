import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../[id]/complete/route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { findSessionByIdAndUser } from '@/lib/utils/api-helpers';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/utils/api-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/api-helpers')>();
  return {
    ...actual,
    findSessionByIdAndUser: vi.fn(),
  };
});

vi.mock('@/lib/domain/sessions', () => ({
  recalculateSessionNumbers: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/sessions/[id]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH', () => {
    it('should complete planned session successfully', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
        sessionType: 'Footing',
      };

      const completionData = {
        date: '2025-12-27T10:00:00.000Z',
        duration: '01:00:00',
        distance: '10.5',
        avgPace: '05:43',
        avgHeartRate: '150',
        perceivedExertion: '7',
        comments: 'Good run',
      };

      const completedSession = {
        ...plannedSession,
        status: 'completed',
        date: completionData.date,
        duration: completionData.duration,
        distance: 10.5,
        avgPace: completionData.avgPace,
        avgHeartRate: 150,
        perceivedExertion: 7,
        comments: completionData.comments,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(completedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(completedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(completedSession);
      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          status: 'completed',
          date: new Date(completionData.date),
          duration: completionData.duration,
          distance: 10.5,
          avgPace: completionData.avgPace,
          avgHeartRate: 150,
          perceivedExertion: 7,
          comments: completionData.comments,
        },
      });
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('should return 404 when session not found', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Séance non trouvée' });
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('should return 400 when session is not planned', async () => {
      const completedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'completed',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(completedSession as never);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify({
          date: '2025-12-27T10:00:00.000Z',
          duration: '01:00:00',
          distance: '10',
          avgPace: '06:00',
          avgHeartRate: '150',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Cette séance n'est pas planifiée" });
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('should handle missing perceivedExertion', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
      };

      const completionData = {
        date: '2025-12-27T10:00:00.000Z',
        duration: '01:00:00',
        distance: '10',
        avgPace: '06:00',
        avgHeartRate: '150',
      };

      const completedSession = {
        ...plannedSession,
        status: 'completed',
        perceivedExertion: 0,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(completedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(completedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          perceivedExertion: 0,
        }),
      });
    });

    it('should parse numeric fields correctly', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
      };

      const completionData = {
        date: '2025-12-27T10:00:00.000Z',
        duration: '01:00:00',
        distance: '10.75',
        avgPace: '05:30',
        avgHeartRate: '165',
        perceivedExertion: '8',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue({} as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue({} as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });

      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          distance: 10.75,
          avgHeartRate: 165,
          perceivedExertion: 8,
        }),
      });
    });

    it('should refresh session after recalculation', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
      };

      const updatedSession = {
        ...plannedSession,
        status: 'completed',
        sessionNumber: 5,
      };

      const refreshedSession = {
        ...updatedSession,
        sessionNumber: 10,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(refreshedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify({
          date: '2025-12-27T10:00:00.000Z',
          duration: '01:00:00',
          distance: '10',
          avgPace: '06:00',
          avgHeartRate: '150',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(data).toEqual(refreshedSession);
      expect(prisma.training_sessions.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });
  });
});
