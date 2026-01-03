import { getActivityStreams } from './client';
import { getValidAccessToken } from './auth-helpers';
import type { StravaStreamSet } from '@/lib/types';
import { logger } from '@/lib/infrastructure/logger';
import { prisma } from '@/lib/database';

export async function fetchStreamsForSession(
  source: string | null,
  externalId: string | null,
  userId: string,
  logContext: string = 'fetch-streams'
): Promise<StravaStreamSet | null> {
  if (source !== 'strava' || !externalId) {
    return null;
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user?.stravaAccessToken || !user?.stravaRefreshToken) {
      return null;
    }

    const accessToken = await getValidAccessToken(user);
    const activityId = parseInt(externalId, 10);
    const streams = await getActivityStreams(accessToken, activityId);

    if (Object.keys(streams).length > 0) {
      logger.info({ activityId, userId, context: logContext }, 'Strava streams fetched');
      return streams;
    }

    return null;
  } catch (error) {
    logger.error(
      { error, externalId, userId, context: logContext },
      'Failed to fetch Strava streams, continuing without them'
    );
    return null;
  }
}
