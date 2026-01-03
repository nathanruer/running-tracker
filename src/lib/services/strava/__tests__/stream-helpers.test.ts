import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStreamsForSession } from '../stream-helpers';
import type { StravaStreamSet } from '@/lib/types';

type MockUser = {
  id: string;
  stravaAccessToken: string | null;
  stravaRefreshToken: string | null;
};

vi.mock('../client', () => ({
  getActivityStreams: vi.fn(),
}));

vi.mock('../auth-helpers', () => ({
  getValidAccessToken: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
  },
}));

const mockGetActivityStreams = vi.mocked(
  (await import('../client')).getActivityStreams
);
const mockGetValidAccessToken = vi.mocked(
  (await import('../auth-helpers')).getValidAccessToken
);
const { prisma } = await import('@/lib/database');
const mockFindUnique = vi.mocked(prisma.users.findUnique);

describe('fetchStreamsForSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when source is not strava', async () => {
    const result = await fetchStreamsForSession('manual', '123', 'user-id');
    expect(result).toBeNull();
  });

  it('should return null when externalId is null', async () => {
    const result = await fetchStreamsForSession('strava', null, 'user-id');
    expect(result).toBeNull();
  });

  it('should return null when user is not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await fetchStreamsForSession('strava', '123', 'user-id');
    expect(result).toBeNull();
  });

  it('should return null when user has no strava tokens', async () => {
    const mockUser: MockUser = {
      id: 'user-id',
      stravaAccessToken: null,
      stravaRefreshToken: null,
    };
    mockFindUnique.mockResolvedValue(mockUser as never);

    const result = await fetchStreamsForSession('strava', '123', 'user-id');
    expect(result).toBeNull();
  });

  it('should fetch and return streams when conditions are met', async () => {
    const mockStreams: StravaStreamSet = {
      altitude: { data: [100, 110], series_type: 'distance', original_size: 2, resolution: 'high' },
    };

    const mockUser: MockUser = {
      id: 'user-id',
      stravaAccessToken: 'access-token',
      stravaRefreshToken: 'refresh-token',
    };
    mockFindUnique.mockResolvedValue(mockUser as never);

    mockGetValidAccessToken.mockResolvedValue('valid-token');
    mockGetActivityStreams.mockResolvedValue(mockStreams);

    const result = await fetchStreamsForSession('strava', '123', 'user-id');
    expect(result).toEqual(mockStreams);
    expect(mockGetActivityStreams).toHaveBeenCalledWith('valid-token', 123);
  });

  it('should return null when streams are empty', async () => {
    const mockUser: MockUser = {
      id: 'user-id',
      stravaAccessToken: 'access-token',
      stravaRefreshToken: 'refresh-token',
    };
    mockFindUnique.mockResolvedValue(mockUser as never);

    mockGetValidAccessToken.mockResolvedValue('valid-token');
    mockGetActivityStreams.mockResolvedValue({});

    const result = await fetchStreamsForSession('strava', '123', 'user-id');
    expect(result).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database error'));

    const result = await fetchStreamsForSession('strava', '123', 'user-id');
    expect(result).toBeNull();
  });
});
