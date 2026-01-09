import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { getNextSessionNumber } from '@/lib/domain/sessions/utils';
import { decodePolyline } from '@/lib/utils/geo/polyline';
import { getHistoricalWeather } from '@/lib/services/weather';

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

vi.mock('@/lib/utils/geo/polyline', () => ({
  decodePolyline: vi.fn(),
  coordinatesToSVG: vi.fn(),
}));

vi.mock('@/lib/services/weather', () => ({
  getHistoricalWeather: vi.fn(),
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
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(newSession),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.session).toEqual(createdSession);
      expect(getNextSessionNumber).toHaveBeenCalledWith('user-123');
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123', expect.any(Date));
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
        intervalDetails: sessionWithIntervals.intervalDetails, // Ensure it's in created object for findUnique mock
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(getNextSessionNumber).mockResolvedValue(1);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(createdSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

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

    it('should enrich session with weather data when strava polyline is present', async () => {
      const stravaSession = {
        sessionType: 'Footing',
        date: '2025-12-27T10:00:00.000Z',
        distance: 10,
        duration: '01:00:00',
        avgPace: '06:00',
        avgHeartRate: 150,
        stravaData: {
          id: 123456,
          name: 'Morning Run',
          distance: 10000,
          moving_time: 3600,
          elapsed_time: 3700,
          total_elevation_gain: 100,
          type: 'Run',
          start_date: '2025-12-27T10:00:00Z',
          start_date_local: '2025-12-27T11:00:00',
          average_speed: 2.78,
          max_speed: 3.5,
          map: {
            id: 'map123',
            summary_polyline: 'encoded_polyline_string'
          }
        }
      };

      const createdSession = {
        id: 'session-strava-123',
        ...stravaSession,
        userId: 'user-123',
        sessionNumber: 6,
        week: 1,
        status: 'completed',
        weather: {
          conditionCode: 1,
          temperature: 15,
          windSpeed: 10,
          precipitation: 0
        }
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(getNextSessionNumber).mockResolvedValue(6);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(createdSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);
      
      vi.mocked(decodePolyline).mockReturnValue([[48.8566, 2.3522]]);
      vi.mocked(getHistoricalWeather).mockResolvedValue({
        conditionCode: 1,
        temperature: 15,
        windSpeed: 10,
        precipitation: 0
      });

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(stravaSession),
      });

      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(201);
      
      expect(decodePolyline).toHaveBeenCalledWith('encoded_polyline_string');
      
      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weather: {
              conditionCode: 1,
              temperature: 15,
              windSpeed: 10,
              precipitation: 0
            }
          })
        })
      );
    });

    it('should handle Strava session without polyline gracefully (no weather)', async () => {
      const stravaSession = {
        sessionType: 'Tapis',
        date: '2025-12-27T10:00:00.000Z',
        distance: 5,
        duration: '00:30:00',
        avgPace: '06:00',
        stravaData: {
          id: 12345,
          name: 'Treadmill Run',
          distance: 5000,
          moving_time: 1800,
          elapsed_time: 1850,
          total_elevation_gain: 0,
          type: 'Run',
          start_date: '2025-12-27T10:00:00Z',
          start_date_local: '2025-12-27T11:00:00',
          average_speed: 2.78,
          max_speed: 3.0
        }
      };

      const createdSession = {
        id: 'session-strava-no-map',
        ...stravaSession,
        userId: 'user-123',
        sessionNumber: 7,
        week: 1,
        status: 'completed',
        weather: null
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(getNextSessionNumber).mockResolvedValue(7);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(createdSession as never);

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(stravaSession),
      });

      await POST(request);

      expect(decodePolyline).not.toHaveBeenCalled();
      expect(getHistoricalWeather).not.toHaveBeenCalled();
      
      expect(prisma.training_sessions.create).toHaveBeenCalled();
    });

    it('should create session without weather if weather service fails', async () => {
      const stravaSession = {
        sessionType: 'Footing',
        date: '2025-12-27T10:00:00.000Z',
        distance: 10,
        duration: '01:00:00',
        avgPace: '06:00',
        avgHeartRate: 150,
        stravaData: {
          id: 123789,
          name: 'Evening Run',
          distance: 10000,
          moving_time: 3600,
          elapsed_time: 3700,
          total_elevation_gain: 100,
          type: 'Run',
          start_date: '2025-12-27T10:00:00Z',
          start_date_local: '2025-12-27T11:00:00',
          average_speed: 2.78,
          max_speed: 3.5,
          map: {
            id: 'map789',
            summary_polyline: 'valid_polyline'
          }
        }
      };

      const createdSession = {
        id: 'session-weather-error',
        ...stravaSession,
        userId: 'user-123',
        sessionNumber: 8,
        week: 1,
        status: 'completed',
        weather: null
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(getNextSessionNumber).mockResolvedValue(8);
      vi.mocked(prisma.training_sessions.create).mockResolvedValue(createdSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(createdSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      vi.mocked(decodePolyline).mockReturnValue([[48.85, 2.35]]);
      vi.mocked(getHistoricalWeather).mockRejectedValue(new Error('API Down'));

      const request = new NextRequest('http://localhost/api/sessions', {
        method: 'POST',
        body: JSON.stringify(stravaSession),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      
      expect(getHistoricalWeather).toHaveBeenCalled();
      
      expect(prisma.training_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
          })
        })
      );
    });
  });
});
