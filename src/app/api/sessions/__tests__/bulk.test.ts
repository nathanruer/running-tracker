import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE } from '../bulk/route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

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

describe('/api/sessions/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should create multiple sessions successfully', async () => {
      const sessions = [
        {
          sessionType: 'Footing',
          date: '2025-12-27T10:00:00.000Z',
          distance: 10,
          duration: '01:00:00',
          avgPace: '06:00',
          avgHeartRate: 150,
        },
        {
          sessionType: 'Fractionné',
          date: '2025-12-26T10:00:00.000Z',
          distance: 8,
          duration: '00:45:00',
          avgPace: '05:37',
          avgHeartRate: 165,
        },
      ];

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.createMany).mockResolvedValue({ count: 2 } as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        message: '2 séance(s) importée(s) avec succès',
        count: 2,
      });
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.createMany).not.toHaveBeenCalled();
    });

    it('should return 400 when sessions array is empty', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Le tableau de séances est requis' });
      expect(prisma.training_sessions.createMany).not.toHaveBeenCalled();
    });

    it('should return 400 when sessions is not an array', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions: 'not-an-array' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Le tableau de séances est requis' });
    });

    it('should return 400 on validation error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'POST',
        body: JSON.stringify({
          sessions: [{ invalid: 'data' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(prisma.training_sessions.createMany).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.createMany).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'POST',
        body: JSON.stringify({
          sessions: [
            {
              sessionType: 'Footing',
              date: '2025-12-27T10:00:00.000Z',
              distance: 10,
              duration: '01:00:00',
              avgPace: '06:00',
              avgHeartRate: 150,
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });

  describe('DELETE', () => {
    it('should delete multiple sessions successfully', async () => {
      const ids = ['session-1', 'session-2', 'session-3'];

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.deleteMany).mockResolvedValue({ count: 3 } as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message: '3 séance(s) supprimée(s) avec succès',
        count: 3,
      });
      expect(prisma.training_sessions.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ids },
          userId: 'user-123',
        },
      });
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['session-1'] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.deleteMany).not.toHaveBeenCalled();
    });

    it('should return 400 when ids array is empty', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: [] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Le tableau d'identifiants est requis" });
      expect(prisma.training_sessions.deleteMany).not.toHaveBeenCalled();
    });

    it('should return 400 when ids is not an array', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: 'not-an-array' }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Le tableau d'identifiants est requis" });
    });

    it('should return 500 on database error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.deleteMany).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/sessions/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['session-1'] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });
});
