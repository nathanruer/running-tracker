import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getValidAccessToken } from '../auth-helpers';
import * as stravaClient from '../client';
import { prisma } from '@/lib/database';

vi.mock('../client', () => ({
  refreshAccessToken: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  prisma: {
    users: {
      update: vi.fn(),
    },
  },
}));

describe('auth-helpers', () => {
  const mockRefreshAccessToken = vi.mocked(stravaClient.refreshAccessToken);
  const mockPrismaUpdate = vi.mocked(prisma.users.update);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getValidAccessToken', () => {
    const baseUser = {
      id: 'user-123',
      stravaAccessToken: 'valid-access-token',
      stravaRefreshToken: 'valid-refresh-token',
      stravaTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    };

    it('should return existing token when not expired', async () => {
      const result = await getValidAccessToken(baseUser);

      expect(result).toBe('valid-access-token');
      expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    });

    it('should throw error when no access token exists', async () => {
      const userWithoutToken = {
        ...baseUser,
        stravaAccessToken: null,
      };

      await expect(getValidAccessToken(userWithoutToken)).rejects.toThrow(
        'No Strava tokens found'
      );
    });

    it('should throw error when no refresh token exists', async () => {
      const userWithoutRefresh = {
        ...baseUser,
        stravaRefreshToken: null,
      };

      await expect(getValidAccessToken(userWithoutRefresh)).rejects.toThrow(
        'No Strava tokens found'
      );
    });

    it('should refresh token when it expires in less than 5 minutes', async () => {
      const userWithExpiringToken = {
        ...baseUser,
        stravaTokenExpiresAt: new Date(Date.now() + 60000), // 1 minute from now
      };

      const newTokenData = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        athlete: { id: 123 },
      };

      mockRefreshAccessToken.mockResolvedValue(newTokenData);

      const result = await getValidAccessToken(userWithExpiringToken);

      expect(mockRefreshAccessToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          stravaAccessToken: 'new-access-token',
          stravaRefreshToken: 'new-refresh-token',
        }),
      });
      expect(result).toBe('new-access-token');
    });

    it('should refresh token when expiry date is null', async () => {
      const userWithNullExpiry = {
        ...baseUser,
        stravaTokenExpiresAt: null,
      };

      const newTokenData = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        athlete: { id: 123 },
      };

      mockRefreshAccessToken.mockResolvedValue(newTokenData);

      const result = await getValidAccessToken(userWithNullExpiry);

      expect(mockRefreshAccessToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toBe('new-access-token');
    });

    it('should refresh token when already expired', async () => {
      const userWithExpiredToken = {
        ...baseUser,
        stravaTokenExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      const newTokenData = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        athlete: { id: 123 },
      };

      mockRefreshAccessToken.mockResolvedValue(newTokenData);

      const result = await getValidAccessToken(userWithExpiredToken);

      expect(mockRefreshAccessToken).toHaveBeenCalled();
      expect(result).toBe('new-access-token');
    });
  });
});
