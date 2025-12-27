import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../planned/bulk/route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/sessions/planned/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should create multiple planned sessions successfully', async () => {
      const sessions = [
        {
          sessionType: 'Footing',
          targetDuration: '01:00:00',
          targetDistance: 10,
          plannedDate: '2025-12-27T10:00:00.000Z',
        },
        {
          sessionType: 'Fractionné',
          targetDuration: '00:45:00',
          targetDistance: 8,
          plannedDate: '2025-12-28T10:00:00.000Z',
        },
      ];

      const firstSession = {
        date: new Date('2025-12-20T10:00:00.000Z'),
      };

      const createdSessions = sessions.map((session, index) => ({
        id: `session-${index + 1}`,
        userId: 'user-123',
        sessionNumber: index + 5,
        week: 2,
        status: 'planned',
        ...session,
      }));

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([
        { sessionNumber: 4 },
      ] as never);
      vi.mocked(prisma.training_sessions.findFirst).mockResolvedValue(firstSession as never);

      vi.mocked(prisma.training_sessions.create)
        .mockResolvedValueOnce(createdSessions[0] as never)
        .mockResolvedValueOnce(createdSessions[1] as never);

      const request = new NextRequest('http://localhost/api/sessions/planned/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message: '2 séance(s) ajoutée(s) avec succès',
        sessions: createdSessions,
        count: 2,
      });
      expect(prisma.training_sessions.create).toHaveBeenCalledTimes(2);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/planned/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.create).not.toHaveBeenCalled();
    });

    it('should return 400 when sessions array is empty', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/sessions/planned/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Le tableau de séances est requis et ne peut pas être vide',
      });
      expect(prisma.training_sessions.create).not.toHaveBeenCalled();
    });

    it('should return 400 when sessions is not an array', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/sessions/planned/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions: 'not-an-array' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Le tableau de séances est requis et ne peut pas être vide',
      });
    });

    it('should increment session numbers for each session', async () => {
      const sessions = [
        { sessionType: 'Footing', targetDuration: '01:00:00' },
        { sessionType: 'Fractionné', targetDuration: '00:45:00' },
        { sessionType: 'Seuil', targetDuration: '00:30:00' },
      ];

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([
        { sessionNumber: 10 },
      ] as never);
      vi.mocked(prisma.training_sessions.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.training_sessions.create)
        .mockResolvedValueOnce({
          id: 'session-11',
          sessionNumber: 11,
        } as never)
        .mockResolvedValueOnce({
          id: 'session-12',
          sessionNumber: 12,
        } as never)
        .mockResolvedValueOnce({
          id: 'session-13',
          sessionNumber: 13,
        } as never);

      const request = new NextRequest('http://localhost/api/sessions/planned/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions }),
      });

      await POST(request);

      expect(prisma.training_sessions.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({ sessionNumber: 11 }),
        })
      );
      expect(prisma.training_sessions.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({ sessionNumber: 12 }),
        })
      );
      expect(prisma.training_sessions.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: expect.objectContaining({ sessionNumber: 13 }),
        })
      );
    });

    it('should calculate week for each session based on plannedDate', async () => {
      const sessions = [
        {
          sessionType: 'Footing',
          targetDuration: '01:00:00',
          plannedDate: '2025-12-27T10:00:00.000Z',
        },
      ];

      const firstSession = {
        date: new Date('2025-12-20T10:00:00.000Z'),
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([
        { sessionNumber: 1 },
      ] as never);
      vi.mocked(prisma.training_sessions.findFirst).mockResolvedValue(firstSession as never);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({
        id: 'session-1',
        week: 2,
      } as never);

      const request = new NextRequest('http://localhost/api/sessions/planned/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions }),
      });

      await POST(request);

      expect(prisma.training_sessions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          week: 2,
        }),
      });
    });

    it('should handle interval details for each session', async () => {
      const sessions = [
        {
          sessionType: 'Fractionné',
          targetDuration: '01:00:00',
          intervalDetails: {
            workoutType: 'interval',
            repetitionCount: 5,
          },
        },
      ];

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([
        { sessionNumber: 1 },
      ] as never);
      vi.mocked(prisma.training_sessions.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({
        id: 'session-1',
      } as never);

      const request = new NextRequest('http://localhost/api/sessions/planned/bulk', {
        method: 'POST',
        body: JSON.stringify({ sessions }),
      });

      await POST(request);

      expect(prisma.training_sessions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          intervalDetails: sessions[0].intervalDetails,
        }),
      });
    });

    it('should return 500 on database error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost/api/sessions/planned/bulk', {
        method: 'POST',
        body: JSON.stringify({
          sessions: [{ sessionType: 'Footing', targetDuration: '01:00:00' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });
});
