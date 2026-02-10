import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { getActivityDetails, formatStravaActivity, getValidAccessToken } from '@/server/services/strava';
import { handleGetRequest } from '@/server/services/api-handlers';
import { logger } from '@/server/infrastructure/logger';

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
        select: {
          id: true,
          externalAccounts: {
            where: { provider: 'strava' },
            select: {
              externalId: true,
              accessToken: true,
              refreshToken: true,
              tokenExpiresAt: true,
            },
            take: 1,
          },
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 404 }
        );
      }

      const stravaAccount = user.externalAccounts[0] ?? null;
      if (!stravaAccount?.externalId) {
        return NextResponse.json(
          { error: 'Compte Strava non connecté' },
          { status: 400 }
        );
      }

      const accessToken = await getValidAccessToken({
        userId: user.id,
        accessToken: stravaAccount.accessToken ?? null,
        refreshToken: stravaAccount.refreshToken ?? null,
        tokenExpiresAt: stravaAccount.tokenExpiresAt ?? null,
      });

      const activityId = parseInt(params.id, 10);
      logger.info({ activityId, userId: user.id }, 'Fetching Strava activity');

      const activity = await getActivityDetails(accessToken, activityId);

      const formattedData = formatStravaActivity(activity);

      return NextResponse.json(formattedData);
    },
    { logContext: 'get-strava-activity-details' }
  );
}
