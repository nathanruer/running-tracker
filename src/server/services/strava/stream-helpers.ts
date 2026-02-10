import 'server-only';
import { getActivityStreams } from './client';
import { getValidAccessToken } from './auth-helpers';
import type { StravaStreamSet } from '@/lib/types';
import { logger } from '@/server/infrastructure/logger';
import { prisma } from '@/server/database';

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
    const account = await prisma.external_accounts.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'strava',
        },
      },
    });

    if (!account?.accessToken || !account?.refreshToken) {
      return null;
    }

    const accessToken = await getValidAccessToken({
      userId,
      accessToken: account.accessToken ?? null,
      refreshToken: account.refreshToken ?? null,
      tokenExpiresAt: account.tokenExpiresAt ?? null,
    });
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
