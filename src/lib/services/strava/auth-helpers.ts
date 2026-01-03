import { prisma } from '@/lib/database';
import { refreshAccessToken } from './client';

interface UserWithTokens {
  id: string;
  stravaAccessToken: string | null;
  stravaRefreshToken: string | null;
  stravaTokenExpiresAt: Date | null;
}

/**
 * Gets a valid Strava access token, refreshing it if necessary
 * @param user User with Strava tokens
 * @returns Valid access token
 * @throws If no token is found
 */
export async function getValidAccessToken(user: UserWithTokens): Promise<string> {
  if (!user.stravaAccessToken || !user.stravaRefreshToken) {
    throw new Error('No Strava tokens found');
  }

  const now = new Date();
  const expiresAt = user.stravaTokenExpiresAt;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // Refresh if token expires in less than 5 minutes
  if (!expiresAt || expiresAt < fiveMinutesFromNow) {
    const tokenData = await refreshAccessToken(user.stravaRefreshToken);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
      },
    });

    return tokenData.access_token;
  }

  return user.stravaAccessToken;
}
