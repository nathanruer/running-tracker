import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  getActivities,
  getActivityDetails,
  getActivityStreams,
} from '../client';
import { STRAVA_URLS } from '@/lib/constants/strava';
import { GRANT_TYPES } from '@/lib/constants/auth';

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Strava client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockTokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_at: 1234567890,
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokens),
      } as Response);

      const result = await exchangeCodeForTokens('auth-code');

      expect(global.fetch).toHaveBeenCalledWith(STRAVA_URLS.TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('auth-code'),
      });
      expect(result).toEqual(mockTokens);
    });

    it('should throw error when exchange fails', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
      } as Response);

      await expect(exchangeCodeForTokens('invalid-code')).rejects.toThrow(
        'Failed to exchange code for tokens'
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      const mockTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: 1234567890,
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokens),
      } as Response);

      const result = await refreshAccessToken('old-refresh-token');

      expect(global.fetch).toHaveBeenCalledWith(STRAVA_URLS.TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining(GRANT_TYPES.REFRESH_TOKEN),
      });
      expect(result).toEqual(mockTokens);
    });

    it('should throw error when refresh fails', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
      } as Response);

      await expect(refreshAccessToken('invalid-token')).rejects.toThrow(
        'Failed to refresh access token'
      );
    });
  });

  const createMockActivity = (overrides: Partial<{
    id: number;
    name: string;
  }> = {}) => ({
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Morning Run',
    distance: 5000,
    moving_time: 1800,
    elapsed_time: 1850,
    total_elevation_gain: 50,
    type: 'Run',
    start_date: '2024-01-15T08:00:00Z',
    start_date_local: '2024-01-15T09:00:00',
    average_speed: 2.78,
    max_speed: 3.5,
  });

  describe('getActivities', () => {
    it('should fetch activities successfully', async () => {
      const mockActivities = [
        createMockActivity({ id: 1, name: 'Run 1' }),
        createMockActivity({ id: 2, name: 'Run 2' }),
      ];

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivities),
      } as Response);

      const result = await getActivities('access-token');

      expect(global.fetch).toHaveBeenCalledWith(
        `${STRAVA_URLS.ACTIVITIES}?per_page=30&page=1`,
        {
          headers: { Authorization: 'Bearer access-token' },
        }
      );
      expect(result).toEqual(mockActivities);
    });

    it('should use custom perPage parameter', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await getActivities('access-token', 50);

      expect(global.fetch).toHaveBeenCalledWith(
        `${STRAVA_URLS.ACTIVITIES}?per_page=50&page=1`,
        expect.anything()
      );
    });

    it('should use custom page parameter', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await getActivities('access-token', 30, 2);

      expect(global.fetch).toHaveBeenCalledWith(
        `${STRAVA_URLS.ACTIVITIES}?per_page=30&page=2`,
        expect.anything()
      );
    });

    it('should throw error when fetch fails', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
      } as Response);

      await expect(getActivities('access-token')).rejects.toThrow(
        'Failed to fetch activities'
      );
    });
  });

  describe('getActivityDetails', () => {
    it('should fetch activity details successfully', async () => {
      const mockActivity = createMockActivity({ id: 123, name: 'Morning Run' });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivity),
      } as Response);

      const result = await getActivityDetails('access-token', 123);

      expect(global.fetch).toHaveBeenCalledWith(
        `${STRAVA_URLS.API_BASE}/activities/123`,
        {
          headers: { Authorization: 'Bearer access-token' },
        }
      );
      expect(result).toEqual(mockActivity);
    });

    it('should throw error with status when fetch fails', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Not found' }),
      } as unknown as Response);

      await expect(getActivityDetails('access-token', 999)).rejects.toThrow(
        'Failed to fetch activity details: 404 Not Found'
      );
    });
  });

  describe('getActivityStreams', () => {
    it('should fetch activity streams successfully', async () => {
      const mockStreams = {
        velocity_smooth: { data: [2.5, 3.0], series_type: 'distance', original_size: 2, resolution: 'high' },
        distance: { data: [0, 100], series_type: 'distance', original_size: 2, resolution: 'high' },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStreams),
      } as Response);

      const result = await getActivityStreams('access-token', 123);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/123/streams'),
        {
          headers: { Authorization: 'Bearer access-token' },
        }
      );
      expect(result).toEqual(mockStreams);
    });

    it('should use default stream keys', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await getActivityStreams('access-token', 123);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('keys=velocity_smooth,distance,time'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('resolution=high'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('series_type=distance'),
        expect.anything()
      );
    });

    it('should use custom stream keys', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await getActivityStreams('access-token', 123, ['heartrate', 'cadence']);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('keys=heartrate,cadence'),
        expect.anything()
      );
    });

    it('should return empty object for 404 (no streams available)', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      } as unknown as Response);

      const result = await getActivityStreams('access-token', 123);

      expect(result).toEqual({});
    });

    it('should throw error for non-404 failures', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      } as unknown as Response);

      await expect(getActivityStreams('access-token', 123)).rejects.toThrow(
        'Failed to fetch activity streams: 500'
      );
    });
  });
});
