import 'server-only';
import { getActivityStreams } from './client';
import { getValidAccessToken } from './auth-helpers';
import { getIntervalsActivityStreams } from '@/server/services/intervals/client';
import { mapStreamsToStravaShape, buildPolylineFromStreams, INTERVALS_SOURCE } from '@/server/services/intervals/mapper';
import type { StravaStreamSet } from '@/lib/types';
import { logger } from '@/server/infrastructure/logger';
import { prisma } from '@/server/database';

export type StreamFetchStatus =
  | 'ok'
  | 'no_streams'
  | 'not_strava'
  | 'missing_account'
  | 'error';

export interface StreamFetchResult {
  status: StreamFetchStatus;
  streams: StravaStreamSet | null;
  polyline?: string | null;
}

export async function fetchStreamsForSessionWithStatus(
  source: string | null,
  externalId: string | null,
  userId: string,
  logContext: string = 'fetch-streams'
): Promise<StreamFetchResult> {
  if (source === INTERVALS_SOURCE && externalId) {
    try {
      const streams = await getIntervalsActivityStreams(externalId);
      const mapped = mapStreamsToStravaShape(streams);
      const polyline = buildPolylineFromStreams(streams);
      if (!mapped) {
        return { status: 'no_streams', streams: null, polyline };
      }
      return { status: 'ok', streams: mapped as unknown as StravaStreamSet, polyline };
    } catch (error) {
      logger.warn({ error, externalId, logContext }, 'intervals-streams-fetch-failed');
      return { status: 'error', streams: null };
    }
  }

  if (source !== 'strava' || !externalId) {
    return { status: 'not_strava', streams: null };
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
      return { status: 'missing_account', streams: null };
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
      return { status: 'ok', streams };
    }

    return { status: 'no_streams', streams: null };
  } catch (error) {
    logger.error(
      { error, externalId, userId, context: logContext },
      'Failed to fetch Strava streams, continuing without them'
    );
    return { status: 'error', streams: null };
  }
}

export async function fetchStreamsForSession(
  source: string | null,
  externalId: string | null,
  userId: string,
  logContext: string = 'fetch-streams'
): Promise<StravaStreamSet | null> {
  const result = await fetchStreamsForSessionWithStatus(source, externalId, userId, logContext);
  return result.status === 'ok' ? result.streams : null;
}
