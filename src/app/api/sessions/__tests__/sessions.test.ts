import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { getNextSessionNumber } from '@/lib/domain/sessions/utils';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/domain/sessions', () => ({
  recalculateSessionNumbers: vi.fn(),
}));

vi.mock('@/lib/domain/sessions/utils', () => ({
  getNextSessionNumber: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return sessions for authenticated user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          sessionType: 'Footing',
          status: 'completed',
          sessionNumber: 1,
          date: '2025-12-27T10:00:00.000Z',
        },
        {
          id: 'session-2',
          userId: 'user-123',
          sessionType: 'Fractionné',
          status: 'completed',
          sessionNumber: 2,
          date: '2025-12-26T10:00:00.000Z',
        },
      ];

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue(mockSessions as never);

      const request = new NextRequest('http://localhost/api/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ sessions: mockSessions });
      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.findMany).not.toHaveBeenCalled();
    });

    it('should filter by session type', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?type=Footing');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', sessionType: 'Footing' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('should filter by status', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?status=planned');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'planned' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('should apply limit and offset pagination', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?limit=10&offset=20');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
        take: 10,
        skip: 20,
      });
    });

    it('should ignore "all" filter values', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?type=all&status=all');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });
  });

  describe('POST', () => {
    it('should create session successfully', async () => {
      const newSession = {
        sessionType: 'Footing',
        date: '2025-12-27T10:00:00.000Z',
        distance: 10,
        duration: '01:00:00',
        avgPace: '06:00',
        avgHeartRate: 150,
      };

      const createdSession = {
        id: 'session-123',
        ...newSession,
        userId: 'user-123',
        sessionNumber: 5,
        week: 1,
        status: 'completed',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(getNextSessionNumber).mockResolvedValue(5);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(createdSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(newSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.session).toEqual(createdSession);
      expect(getNextSessionNumber).toHaveBeenCalledWith('user-123');
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionType: 'Footing' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.create).not.toHaveBeenCalled();
    });

    it('should return 400 on validation error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(prisma.training_sessions.create).not.toHaveBeenCalled();
    });

    it('should handle interval details', async () => {
      const sessionWithIntervals = {
        sessionType: 'Fractionné',
        date: '2025-12-27T10:00:00.000Z',
        distance: 10,
        duration: '01:00:00',
        avgPace: '06:00',
        avgHeartRate: 160,
        intervalDetails: {
          workoutType: 'interval',
          repetitionCount: 5,
          effortDuration: '04:00',
          recoveryDuration: '02:00',
          effortDistance: null,
          targetEffortPace: '05:00',
          targetEffortHR: null,
          targetRecoveryPace: null,
          steps: [
            {
              stepNumber: 1,
              stepType: 'warmup' as const,
              duration: '10:00',
              distance: 2,
              pace: '06:00',
              hr: 140,
            },
          ],
        },
      };

      const createdSession = {
        id: 'session-123',
        ...sessionWithIntervals,
        userId: 'user-123',
        sessionNumber: 1,
        week: 1,
        status: 'completed',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(getNextSessionNumber).mockResolvedValue(1);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(createdSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(sessionWithIntervals),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            intervalDetails: sessionWithIntervals.intervalDetails,
          }),
        })
      );
    });

    it('should return 500 on database error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(getNextSessionNumber).mockResolvedValue(1);
      vi.mocked(prisma.training_sessions.create).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          sessionType: 'Footing',
          date: '2025-12-27T10:00:00.000Z',
          distance: 10,
          duration: '01:00:00',
          avgPace: '06:00',
          avgHeartRate: 150,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });
});
