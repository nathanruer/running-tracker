import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../activities/route';
import { prisma } from '@/server/database';
import { getActivities, getValidAccessToken, getAthleteStats } from '@/server/services/strava';

vi.mock('@/server/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/server/services/strava', () => ({
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

vi.mock('@/server/auth', () => ({
  getUserIdFromRequest: vi.fn(() => 'user-123'),
}));

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  stravaId: '12345',
  stravaAccessToken: 'valid-token',
  stravaRefreshToken: 'refresh-token',
  stravaTokenExpiresAt: new Date(Date.now() + 7200000),
};

const mockStats = {
  all_run_totals: {
    count: 139,
    distance: 1500000,
    moving_time: 500000,
    elapsed_time: 520000,
    elevation_gain: 5000,
  },
};

const makeRun = (id: number, date: string) => ({
  id,
  name: `Run ${id}`,
  type: 'Run',
  distance: 5000,
  moving_time: 1800,
  elapsed_time: 1900,
  total_elevation_gain: 50,
  start_date: date,
  start_date_local: date,
  average_speed: 2.78,
  max_speed: 3.5,
});

const makeSki = (id: number, date: string) => ({
  id,
  name: `Ski ${id}`,
  type: 'NordicSki',
  distance: 15000,
  moving_time: 7200,
  elapsed_time: 7500,
  total_elevation_gain: 200,
  start_date: date,
  start_date_local: date,
  average_speed: 2.08,
  max_speed: 3.0,
  external_id: null,
  upload_id: null,
});

describe('/api/strava/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(getValidAccessToken).mockResolvedValue('valid-token');
    vi.mocked(getAthleteStats).mockResolvedValue(mockStats);
  });

  it('should return running activities only', async () => {
    const mixed = [
      makeRun(1, '2024-01-02T08:00:00Z'),
      makeSki(2, '2024-01-01T10:00:00Z'),
      makeRun(3, '2024-01-01T08:00:00Z'),
    ];
    vi.mocked(getActivities).mockResolvedValue(mixed);

    const request = new NextRequest('http://localhost/api/strava/activities');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.activities).toHaveLength(2);
    expect(data.activities.every((a: { type: string }) => a.type === 'Run')).toBe(true);
    expect(data.totalCount).toBe(139);
  });

  it('should pass before cursor to getActivities', async () => {
    vi.mocked(getActivities).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/strava/activities?before=1704067200');
    await GET(request);

    expect(getActivities).toHaveBeenCalledWith('valid-token', 50, 1, 1704067200);
  });

  it('should return nextCursor when there are more activities', async () => {
    const runs = Array.from({ length: 50 }, (_, i) =>
      makeRun(i + 1, `2024-01-${String(50 - i).padStart(2, '0')}T08:00:00Z`)
    );
    vi.mocked(getActivities).mockResolvedValue(runs);

    const request = new NextRequest('http://localhost/api/strava/activities?per_page=30');
    const response = await GET(request);
    const data = await response.json();

    expect(data.activities).toHaveLength(30);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBeTypeOf('number');
  });

  it('should return hasMore false and no cursor when all activities loaded', async () => {
    const runs = [makeRun(1, '2024-01-01T08:00:00Z')];
    vi.mocked(getActivities).mockResolvedValue(runs);

    const request = new NextRequest('http://localhost/api/strava/activities');
    const response = await GET(request);
    const data = await response.json();

    expect(data.activities).toHaveLength(1);
    expect(data.hasMore).toBe(false);
    expect(data.nextCursor).toBeNull();
  });

  it('should loop to accumulate enough runs when mixed with non-run activities', async () => {
    const firstBatch = [
      makeRun(1, '2024-01-10T08:00:00Z'),
      ...Array.from({ length: 49 }, (_, i) => makeSki(100 + i, `2024-01-0${9 - Math.min(i, 8)}T10:00:00Z`)),
    ];
    vi.mocked(getActivities)
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce([
        makeRun(4, '2024-01-07T08:00:00Z'),
      ]);

    const request = new NextRequest('http://localhost/api/strava/activities?per_page=2');
    const response = await GET(request);
    const data = await response.json();

    expect(data.activities).toHaveLength(2);
    expect(getActivities).toHaveBeenCalledTimes(2);
  });

  it('should return 404 when user not found', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/strava/activities');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Utilisateur non trouvé');
  });

  it('should return 400 when user has no Strava account connected', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
      ...mockUser,
      stravaId: null,
    } as never);

    const request = new NextRequest('http://localhost/api/strava/activities');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Compte Strava non connecté');
  });
});
