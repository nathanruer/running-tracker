import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../planned/route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      aggregate: vi.fn(),
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

describe('/api/sessions/planned', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should create planned session successfully', async () => {
      const plannedSession = {
        sessionType: 'Footing',
        targetDuration: '01:00:00',
        targetDistance: 10,
        targetPace: '06:00',
        targetHeartRateZone: 2,
        targetRPE: 6,
        comments: 'Test session',
      };

      const createdSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionNumber: 5,
        week: null,
        status: 'planned',
        ...plannedSession,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: 4 },
      } as never);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);

      const request = new NextRequest('http://localhost/api/sessions/planned', {
        method: 'POST',
        body: JSON.stringify(plannedSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(createdSession);
      expect(prisma.training_sessions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          sessionNumber: 5,
          status: 'planned',
          sessionType: 'Footing',
        }),
      });
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/planned', {
        method: 'POST',
        body: JSON.stringify({ sessionType: 'Footing' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.create).not.toHaveBeenCalled();
    });

    it('should calculate week number when plannedDate provided', async () => {
      const plannedSession = {
        sessionType: 'Footing',
        targetDuration: '01:00:00',
        plannedDate: '2025-12-27T10:00:00.000Z',
      };

      const firstSession = {
        date: new Date('2025-12-20T10:00:00.000Z'),
      };

      const createdSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionNumber: 1,
        week: 2,
        status: 'planned',
        ...plannedSession,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: 0 },
      } as never);
      vi.mocked(prisma.training_sessions.findFirst).mockResolvedValue(firstSession as never);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);

      const request = new NextRequest('http://localhost/api/sessions/planned', {
        method: 'POST',
        body: JSON.stringify(plannedSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.week).toBe(2);
      expect(prisma.training_sessions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          week: 2,
          plannedDate: new Date('2025-12-27T10:00:00.000Z'),
        }),
      });
    });

    it('should set week to 1 when no previous sessions exist', async () => {
      const plannedSession = {
        sessionType: 'Footing',
        targetDuration: '01:00:00',
        plannedDate: '2025-12-27T10:00:00.000Z',
      };

      const createdSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionNumber: 1,
        week: 1,
        status: 'planned',
        ...plannedSession,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: 0 },
      } as never);
      vi.mocked(prisma.training_sessions.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);

      const request = new NextRequest('http://localhost/api/sessions/planned', {
        method: 'POST',
        body: JSON.stringify(plannedSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.week).toBe(1);
    });

    it('should handle interval details', async () => {
      const plannedSession = {
        sessionType: 'Fractionné',
        targetDuration: '01:00:00',
        intervalDetails: {
          workoutType: 'interval',
          repetitionCount: 5,
        },
      };

      const createdSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionNumber: 1,
        week: null,
        status: 'planned',
        ...plannedSession,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: 0 },
      } as never);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);

      const request = new NextRequest('http://localhost/api/sessions/planned', {
        method: 'POST',
        body: JSON.stringify(plannedSession),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          intervalDetails: plannedSession.intervalDetails,
        }),
      });
    });

    it('should handle targetHeartRateBpm conversion to string', async () => {
      const plannedSession = {
        sessionType: 'Footing',
        targetDuration: '01:00:00',
        targetHeartRateBpm: 150,
      };

      const createdSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionNumber: 1,
        status: 'planned',
        targetHeartRateBpm: '150',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.aggregate).mockResolvedValue({
        _max: { sessionNumber: 0 },
      } as never);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);

      const request = new NextRequest('http://localhost/api/sessions/planned', {
        method: 'POST',
        body: JSON.stringify(plannedSession),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          targetHeartRateBpm: '150',
        }),
      });
    });

    it('should return 500 on database error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.aggregate).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/sessions/planned', {
        method: 'POST',
        body: JSON.stringify({ sessionType: 'Footing' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });
});
