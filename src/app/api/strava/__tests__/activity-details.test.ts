import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../activities/[id]/route';
import { prisma } from '@/lib/database';
import { getActivityDetails, formatStravaActivity, refreshAccessToken } from '@/lib/services/strava';

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/strava', () => ({
  getActivityDetails: vi.fn(),
  formatStravaActivity: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(() => 'user-123'),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/strava/activities/[id]', () => {
  const mockActivityDetails = {
    id: 123456,
    name: 'Morning Run',
    type: 'Run',
    distance: 5000,
    moving_time: 1800,
    elapsed_time: 1900,
    total_elevation_gain: 50,
    start_date: '2024-01-01T08:00:00Z',
    start_date_local: '2024-01-01T09:00:00Z',
    average_speed: 2.78,
    max_speed: 3.5,
    average_heartrate: 150,
    max_heartrate: 175,
    average_cadence: 85,
    average_temp: 15,
    calories: 350,
    map: {
      id: 'a123456',
      summary_polyline: 'encoded_polyline_data',
    },
  };

  const mockFormattedActivity = {
    date: '2024-01-01',
    sessionType: '',
    duration: '00:30:00',
    distance: 5,
    avgPace: '06:00',
    avgHeartRate: 150,
    comments: 'Morning Run',
    externalId: '123456',
    source: 'strava',
    stravaData: mockActivityDetails,
    elevationGain: 50,
    maxElevation: undefined,
    minElevation: undefined,
    averageCadence: 85,
    averageTemp: 15,
    calories: 350,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return formatted activity details with valid token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'valid-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 7200000),
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getActivityDetails).mockResolvedValue(mockActivityDetails);
    vi.mocked(formatStravaActivity).mockReturnValue(mockFormattedActivity);

    const request = new NextRequest('http://localhost/api/strava/activities/123456', {
      method: 'GET',
    });

    const params = Promise.resolve({ id: '123456' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockFormattedActivity);
    expect(getActivityDetails).toHaveBeenCalledWith('valid-token', 123456);
    expect(formatStravaActivity).toHaveBeenCalledWith(mockActivityDetails);
  });

  it('should refresh token when expired before fetching details', async () => {
    const expiredTokenUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'expired-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() - 1000),
    };

    const newTokenData = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 21600,
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(expiredTokenUser as never);
    vi.mocked(refreshAccessToken).mockResolvedValue(newTokenData);
    vi.mocked(prisma.users.update).mockResolvedValue({
      ...expiredTokenUser,
      stravaAccessToken: newTokenData.access_token,
    } as never);
    vi.mocked(getActivityDetails).mockResolvedValue(mockActivityDetails);
    vi.mocked(formatStravaActivity).mockReturnValue(mockFormattedActivity);

    const request = new NextRequest('http://localhost/api/strava/activities/123456', {
      method: 'GET',
    });

    const params = Promise.resolve({ id: '123456' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(refreshAccessToken).toHaveBeenCalledWith('refresh-token');
    expect(getActivityDetails).toHaveBeenCalledWith('new-access-token', 123456);
    expect(data).toEqual(mockFormattedActivity);
  });

  it('should return 404 when user is not found', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/strava/activities/123456', {
      method: 'GET',
    });

    const params = Promise.resolve({ id: '123456' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Utilisateur non trouvé' });
  });

  it('should return 400 when user has no Strava account connected', async () => {
    const userWithoutStrava = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: null,
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(userWithoutStrava as never);

    const request = new NextRequest('http://localhost/api/strava/activities/123456', {
      method: 'GET',
    });

    const params = Promise.resolve({ id: '123456' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Compte Strava non connecté' });
  });

  it('should handle invalid activity ID', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'valid-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 7200000),
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getActivityDetails).mockRejectedValue(
      new Error('Failed to fetch activity details: 404 Not Found')
    );

    const request = new NextRequest('http://localhost/api/strava/activities/999999', {
      method: 'GET',
    });

    const params = Promise.resolve({ id: '999999' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error');
  });

  it('should handle Strava API errors', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'valid-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 7200000),
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getActivityDetails).mockRejectedValue(new Error('Strava API error'));

    const request = new NextRequest('http://localhost/api/strava/activities/123456', {
      method: 'GET',
    });

    const params = Promise.resolve({ id: '123456' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Strava API error' });
  });

  it('should parse activity ID correctly', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'valid-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 7200000),
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getActivityDetails).mockResolvedValue(mockActivityDetails);
    vi.mocked(formatStravaActivity).mockReturnValue(mockFormattedActivity);

    const request = new NextRequest('http://localhost/api/strava/activities/987654321', {
      method: 'GET',
    });

    const params = Promise.resolve({ id: '987654321' });
    await GET(request, { params });

    expect(getActivityDetails).toHaveBeenCalledWith('valid-token', 987654321);
  });
});
