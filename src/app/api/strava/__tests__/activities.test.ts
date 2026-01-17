import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../activities/route';
import { prisma } from '@/lib/database';
import { getActivities, getValidAccessToken, getAthleteStats } from '@/lib/services/strava';

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
  getValidAccessToken: vi.fn(),
  getAthleteStats: vi.fn(),
  formatStravaActivity: vi.fn((activity) => ({
    date: activity.start_date_local,
    sessionType: '',
    duration: '00:30:00',
    distance: activity.distance / 1000,
    avgPace: '06:00',
    avgHeartRate: null,
    comments: activity.name,
    externalId: String(activity.id),
    source: 'strava',
    type: activity.type,
  })),
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
  ];

  const mockStats = {
    all_run_totals: {
      count: 139,
      distance: 1500000,
      moving_time: 500000,
      elapsed_time: 520000,
      elevation_gain: 5000,
    }
  };

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
      stravaTokenExpiresAt: new Date(Date.now() + 7200000),
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getValidAccessToken).mockResolvedValue('valid-token');
    vi.mocked(getActivities).mockResolvedValue(mockActivities);
    vi.mocked(getAthleteStats).mockResolvedValue(mockStats);

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.activities).toHaveLength(2);
    expect(data.totalCount).toBe(139);
    expect(getActivities).toHaveBeenCalledWith('valid-token', 20, 1);
  });

  it('should handle custom page parameter', async () => {
    const mockUser = {
      id: 'user-123',
      stravaId: '12345',
      stravaAccessToken: 'valid-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 7200000),
    };

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getValidAccessToken).mockResolvedValue('valid-token');
    vi.mocked(getActivities).mockResolvedValue(mockActivities);
    vi.mocked(getAthleteStats).mockResolvedValue(mockStats);

    const request = new NextRequest('http://localhost/api/strava/activities?page=2', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getActivities).toHaveBeenCalledWith('valid-token', 20, 2);
    expect(data.hasMore).toBe(false);
  });

  it('should set hasMore to true when received max activities', async () => {
    const mockUser = {
      id: 'user-123',
      stravaId: '12345',
      stravaAccessToken: 'valid-token',
      stravaRefreshToken: 'refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 7200000),
    };

    const manyActivities = Array(20).fill(mockActivities[0]);

    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getValidAccessToken).mockResolvedValue('valid-token');
    vi.mocked(getActivities).mockResolvedValue(manyActivities);
    vi.mocked(getAthleteStats).mockResolvedValue(mockStats);

    const request = new NextRequest('http://localhost/api/strava/activities', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(data.hasMore).toBe(true);
  });
});
