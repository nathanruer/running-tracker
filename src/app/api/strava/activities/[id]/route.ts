import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getActivityDetails, formatStravaActivity, refreshAccessToken } from '@/lib/services/strava';
import { handleGetRequest } from '@/lib/services/api-handlers';
import { logger } from '@/lib/infrastructure/logger';

async function getValidAccessToken(user: { id: string; stravaAccessToken: string | null; stravaRefreshToken: string | null; stravaTokenExpiresAt: Date | null }): Promise<string> {
  if (!user.stravaAccessToken || !user.stravaRefreshToken) {
    throw new Error('No Strava tokens found');
  }

  const now = new Date();
  const expiresAt = user.stravaTokenExpiresAt;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

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

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  return handleGetRequest(
    request,
    async (userId) => {
      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 404 }
        );
      }

      if (!user.stravaId) {
        return NextResponse.json(
          { error: 'Compte Strava non connecté' },
          { status: 400 }
        );
      }

      const accessToken = await getValidAccessToken(user);

      const activityId = parseInt(params.id, 10);
      logger.info({ activityId, userId: user.id }, 'Fetching Strava activity');

      const activity = await getActivityDetails(accessToken, activityId);

      const formattedData = formatStravaActivity(activity);

      return NextResponse.json(formattedData);
    },
    { logContext: 'get-strava-activity-details' }
  );
}
