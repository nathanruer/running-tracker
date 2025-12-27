import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT, DELETE } from '../[id]/route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { findSessionByIdAndUser } from '@/lib/utils/api-helpers';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      update: vi.fn(),
      delete: vi.fn(),
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

describe('/api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT', () => {
    it('should update session successfully', async () => {
      const updates = {
        sessionType: 'Footing long',
        distance: 15,
      };

      const existingSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionType: 'Footing',
        distance: 10,
      };

      const updatedSession = {
        ...existingSession,
        ...updates,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ session: updatedSession });
      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: {
          ...updates,
          comments: '',
        },
      });
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'PUT',
        body: JSON.stringify({ distance: 15 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('should return 404 when session not found', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'PUT',
        body: JSON.stringify({ distance: 15 }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Séance introuvable' });
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('should recalculate session numbers when date is updated', async () => {
      const existingSession = {
        id: 'session-123',
        userId: 'user-123',
        date: '2025-12-25T10:00:00.000Z',
      };

      const updatedSession = {
        ...existingSession,
        date: '2025-12-27T10:00:00.000Z',
      };

      const refreshedSession = {
        ...updatedSession,
        sessionNumber: 10,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(refreshedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'PUT',
        body: JSON.stringify({ date: '2025-12-27T10:00:00.000Z' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ session: refreshedSession });
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
      expect(prisma.training_sessions.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });

    it('should handle empty date (set to null)', async () => {
      const existingSession = {
        id: 'session-123',
        userId: 'user-123',
        date: '2025-12-25T10:00:00.000Z',
      };

      const updatedSession = {
        ...existingSession,
        date: null,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(updatedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'PUT',
        body: JSON.stringify({ date: '' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'session-123' }) });

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-123' },
          data: expect.objectContaining({
            date: null,
          }),
        })
      );
    });

    it('should handle interval details updates', async () => {
      const existingSession = {
        id: 'session-123',
        userId: 'user-123',
        intervalDetails: null,
      };

      const intervalDetails = {
        workoutType: 'interval',
        repetitionCount: 5,
        effortDuration: '04:00',
        recoveryDuration: '02:00',
        effortDistance: null,
        targetEffortPace: '05:00',
        targetEffortHR: null,
        targetRecoveryPace: null,
        steps: [],
      };

      const updatedSession = {
        ...existingSession,
        intervalDetails,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'PUT',
        body: JSON.stringify({ intervalDetails }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'session-123' }) });

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            intervalDetails,
          }),
        })
      );
    });
  });

  describe('DELETE', () => {
    it('should delete session successfully', async () => {
      const existingSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionType: 'Footing',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(existingSession as never);
      vi.mocked(prisma.training_sessions.delete).mockResolvedValue(existingSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'Séance supprimée' });
      expect(prisma.training_sessions.delete).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.delete).not.toHaveBeenCalled();
    });

    it('should return 404 when session not found', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/sessions/session-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Séance introuvable' });
      expect(prisma.training_sessions.delete).not.toHaveBeenCalled();
    });
  });
});
