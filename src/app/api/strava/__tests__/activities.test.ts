import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../activities/route';
import { prisma } from '@/lib/database';
import { getActivities, refreshAccessToken } from '@/lib/services/strava';

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/strava', () => ({
  getActivities: vi.fn(),
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

describe('/api/strava/activities', () => {
  const mockActivities = [
    {
      id: 1,
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
    },
    {
      id: 2,
      name: 'Evening Run',
      type: 'Run',
      distance: 10000,
      moving_time: 3600,
      elapsed_time: 3700,
      total_elevation_gain: 100,
      start_date: '2024-01-02T18:00:00Z',
      start_date_local: '2024-01-02T19:00:00Z',
      average_speed: 2.78,
      max_speed: 3.2,
    },
    {
      id: 3,
      name: 'Bike Ride',
      type: 'Ride',
      distance: 20000,
      moving_time: 3600,
      elapsed_time: 3800,
      total_elevation_gain: 200,
      start_date: '2024-01-03T10:00:00Z',
      start_date_local: '2024-01-03T11:00:00Z',
      average_speed: 5.56,
      max_speed: 7.0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return running activities with valid token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'valid-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 7200000), // 2 hours from now
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getActivities).mockResolvedValue(mockActivities);

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.activities).toHaveLength(2);
    expect(data.activities[0].type).toBe('Run');
    expect(data.activities[1].type).toBe('Run');
    expect(getActivities).toHaveBeenCalledWith('valid-token', 30);
  });

  it('should refresh token when expired and fetch activities', async () => {
    const expiredTokenUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'expired-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() - 1000), // Expired
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
    vi.mocked(getActivities).mockResolvedValue(mockActivities);

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(refreshAccessToken).toHaveBeenCalledWith('refresh-token');
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: {
        stravaAccessToken: newTokenData.access_token,
        stravaRefreshToken: newTokenData.refresh_token,
        stravaTokenExpiresAt: expect.any(Date),
      },
    });
    expect(getActivities).toHaveBeenCalledWith('new-access-token', 30);
    expect(data.activities).toHaveLength(2);
  });

  it('should refresh token when expiring soon (within 5 minutes)', async () => {
    const soonToExpireUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'soon-to-expire-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 240000), // 4 minutes from now
    };

    const newTokenData = {
      access_token: 'refreshed-token',
      refresh_token: 'new-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 21600,
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(soonToExpireUser as never);
    vi.mocked(refreshAccessToken).mockResolvedValue(newTokenData);
    vi.mocked(prisma.users.update).mockResolvedValue({
      ...soonToExpireUser,
      stravaAccessToken: newTokenData.access_token,
    } as never);
    vi.mocked(getActivities).mockResolvedValue(mockActivities);

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(refreshAccessToken).toHaveBeenCalled();
  });

  it('should return 404 when user is not found', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
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

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Compte Strava non connecté' });
  });

  it('should handle missing tokens error', async () => {
    const userWithMissingTokens = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: null,
      stravaRefreshToken: null,
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(userWithMissingTokens as never);

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
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
    vi.mocked(getActivities).mockRejectedValue(new Error('Failed to fetch activities'));

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Failed to fetch activities' });
  });

  it('should filter out non-running activities', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      stravaId: '12345',
      stravaAccessToken: 'valid-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 7200000),
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getActivities).mockResolvedValue(mockActivities);

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.activities.every((activity: { type: string }) => activity.type === 'Run')).toBe(true);
    expect(data.activities.find((a: { name: string }) => a.name === 'Bike Ride')).toBeUndefined();
  });
});
