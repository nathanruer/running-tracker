import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { GET, POST } from '../route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { calculateSessionPosition } from '@/lib/domain/sessions/position';
import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { fetchStreamsForSession } from '@/lib/services/strava';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/domain/sessions/position', () => ({
  calculateSessionPosition: vi.fn(),
}));

vi.mock('@/lib/domain/sessions/enrichment', () => ({
  enrichSessionWithWeather: vi.fn(),
}));

vi.mock('@/lib/services/strava', () => ({
  fetchStreamsForSession: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/sessions route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns sessions for authenticated user', async () => {
      const mockSessions = [
        { id: 'session-1', userId: 'user-123', sessionType: 'Footing' },
        { id: 'session-2', userId: 'user-123', sessionType: 'Interval' },
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

    it('returns 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.findMany).not.toHaveBeenCalled();
    });

    it('applies limit and offset pagination', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?limit=10&offset=20');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
        take: 10,
        skip: 20,
      });
    });

    it('filters by session type', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?type=Footing');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', sessionType: 'Footing' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('filters by status', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?status=planned');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'planned' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('ignores "all" filter values', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?type=all&status=all');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('filters by dateFrom', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?dateFrom=2025-01-01');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          date: { gte: new Date('2025-01-01') },
        },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('applies search filter on comments and sessionType', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?search=marathon');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [
            { comments: { contains: 'marathon', mode: 'insensitive' } },
            { sessionType: { contains: 'marathon', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('trims search term', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?search=  test  ');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [
            { comments: { contains: 'test', mode: 'insensitive' } },
            { sessionType: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('ignores empty search term', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?search=   ');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
      });
    });

    it('applies single sort parameter', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?sort=date:asc');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ date: { sort: 'asc', nulls: 'last' } }],
      });
    });

    it('applies multi-sort parameters', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest('http://localhost/api/sessions?sort=date:desc,sessionNumber:asc');
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [
          { date: { sort: 'desc', nulls: 'last' } },
          { sessionNumber: { sort: 'asc', nulls: 'last' } },
        ],
      });
    });

    it('combines multiple filters', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        'http://localhost/api/sessions?type=Footing&status=completed&limit=5&offset=10&dateFrom=2025-01-01&search=morning'
      );
      await GET(request);

      expect(prisma.training_sessions.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: 'completed',
          sessionType: 'Footing',
          date: { gte: new Date('2025-01-01') },
          OR: [
            { comments: { contains: 'morning', mode: 'insensitive' } },
            { sessionType: { contains: 'morning', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ status: 'desc' }, { sessionNumber: 'desc' }],
        take: 5,
        skip: 10,
      });
    });

    it('handles database errors', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(prisma.training_sessions.findMany).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });
  });

  describe('POST', () => {
    const validSession = {
      sessionType: 'Footing',
      date: '2025-01-15T10:00:00.000Z',
      distance: 10,
      duration: '01:00:00',
      avgPace: '06:00',
      avgHeartRate: 150,
    };

    it('creates session successfully', async () => {
      const createdSession = {
        id: 'session-new',
        ...validSession,
        userId: 'user-123',
        sessionNumber: 5,
        week: 3,
        status: 'completed',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 5, week: 3 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(validSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.session).toEqual(createdSession);
      expect(calculateSessionPosition).toHaveBeenCalledWith('user-123', expect.any(Date));
    });

    it('returns 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(validSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.create).not.toHaveBeenCalled();
    });

    it('returns 400 on validation error', async () => {
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

    it('handles interval details', async () => {
      const sessionWithIntervals = {
        ...validSession,
        intervalDetails: {
          workoutType: 'interval',
          repetitionCount: 5,
          effortDuration: '04:00',
          recoveryDuration: '02:00',
          effortDistance: null,
          targetEffortPace: '05:00',
          targetEffortHR: null,
          targetRecoveryPace: null,
          steps: [],
        },
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 1, week: 1 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({
        id: 'session-interval',
        ...sessionWithIntervals,
      } as never);

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

    it('stores JsonNull for missing intervalDetails', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 1, week: 1 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({ id: 'session-1' } as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(validSession),
      });

      await POST(request);

      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            intervalDetails: Prisma.JsonNull,
          }),
        })
      );
    });

    it('enriches session with weather when stravaData is present', async () => {
      const stravaSession = {
        ...validSession,
        stravaData: {
          id: 123456,
          name: 'Morning Run',
          distance: 10000,
          moving_time: 3600,
          elapsed_time: 3700,
          total_elevation_gain: 100,
          type: 'Run',
          start_date: '2025-01-15T10:00:00Z',
          start_date_local: '2025-01-15T11:00:00',
          average_speed: 2.78,
          max_speed: 3.5,
          map: { id: 'map123', summary_polyline: 'encoded_polyline' },
        },
      };

      const weatherData = {
        conditionCode: 1,
        temperature: 15,
        windSpeed: 10,
        precipitation: 0,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 1, week: 1 });
      vi.mocked(enrichSessionWithWeather).mockResolvedValue(weatherData);
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({ id: 'session-strava' } as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(stravaSession),
      });

      await POST(request);

      expect(enrichSessionWithWeather).toHaveBeenCalledWith(
        stravaSession.stravaData,
        expect.any(Date)
      );
      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weather: weatherData,
          }),
        })
      );
    });

    it('stores JsonNull for weather when no stravaData', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 1, week: 1 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({ id: 'session-1' } as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(validSession),
      });

      await POST(request);

      expect(enrichSessionWithWeather).not.toHaveBeenCalled();
      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weather: Prisma.JsonNull,
          }),
        })
      );
    });

    it('fetches strava streams for strava source', async () => {
      const stravaSession = {
        ...validSession,
        source: 'strava',
        externalId: '123456',
      };

      const streamsData = { time: [0, 1, 2], distance: [0, 100, 200] };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 1, week: 1 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(streamsData as never);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({ id: 'session-streams' } as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(stravaSession),
      });

      await POST(request);

      expect(fetchStreamsForSession).toHaveBeenCalledWith(
        'strava',
        '123456',
        'user-123',
        'session-import'
      );
    });

    it('stores JsonNull for stravaStreams when fetch returns null', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 1, week: 1 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({ id: 'session-1' } as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(validSession),
      });

      await POST(request);

      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stravaStreams: Prisma.JsonNull,
          }),
        })
      );
    });

    it('returns 500 on database error', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 1, week: 1 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(validSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Database error' });
    });

    it('sets status to completed', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 1, week: 1 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({ id: 'session-1' } as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(validSession),
      });

      await POST(request);

      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'completed',
          }),
        })
      );
    });

    it('assigns sessionNumber and week from calculateSessionPosition', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(calculateSessionPosition).mockResolvedValue({ sessionNumber: 42, week: 7 });
      vi.mocked(fetchStreamsForSession).mockResolvedValue(null);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue({ id: 'session-1' } as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(validSession),
      });

      await POST(request);

      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionNumber: 42,
            week: 7,
          }),
        })
      );
    });
  });
});
