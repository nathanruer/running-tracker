import 'server-only';
import { prisma } from '@/server/database';
import { refreshAccessToken } from './client';
import { logger } from '@/server/infrastructure/logger';

interface StravaAccountTokens {
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

/**
 * Gets a valid Strava access token, refreshing it if necessary
 * @param user User with Strava tokens
 * @returns Valid access token
 * @throws If no token is found
 */
export async function getValidAccessToken(account: StravaAccountTokens): Promise<string> {
  if (!account.accessToken || !account.refreshToken) {
    throw new Error('No Strava tokens found');
  }

  const now = new Date();
  const expiresAt = account.tokenExpiresAt;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // Refresh if token expires in less than 5 minutes
  if (!expiresAt || expiresAt < fiveMinutesFromNow) {
    const tokenData = await refreshAccessToken(account.refreshToken);
    try {
      await prisma.external_accounts.update({
        where: {
          userId_provider: {
            userId: account.userId,
            provider: 'strava',
          },
        },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt: new Date(tokenData.expires_at * 1000),
        },
      });
    } catch (error) {
      logger.warn({ error, userId: account.userId }, 'Failed to update Strava tokens');
    }

    return tokenData.access_token;
  }

  return account.accessToken;
}
