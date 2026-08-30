import 'server-only';
import { getIntervalsActivityStreams, getIntervalsActivityMap } from './client';
import { getIntervalsApiKey } from './account';
import { mapStreams, buildPolylineFromLatLngs, INTERVALS_SOURCE } from './mapper';
import type { StreamSet } from '@/lib/types';
import { logger } from '@/server/infrastructure/logger';

export type StreamFetchStatus = 'ok' | 'no_streams' | 'not_supported' | 'missing_account' | 'error';

export interface StreamFetchResult {
  status: StreamFetchStatus;
  streams: StreamSet | null;
  polyline?: string | null;
}

/** Streams and route of an external activity; `not_supported` when the source is not intervals.icu. */
export async function fetchStreamsForSessionWithStatus(
  source: string | null,
  externalId: string | null,
  userId: string,
  logContext: string = 'fetch-streams'
): Promise<StreamFetchResult> {
  if (source !== INTERVALS_SOURCE || !externalId) {
    return { status: 'not_supported', streams: null };
  }

  try {
    const apiKey = await getIntervalsApiKey(userId);
    if (!apiKey) {
      return { status: 'missing_account', streams: null };
    }
    const [streams, latlngs] = await Promise.all([
      getIntervalsActivityStreams(apiKey, externalId),
      getIntervalsActivityMap(apiKey, externalId).catch((error: unknown) => {
        logger.warn({ error, externalId, logContext }, 'intervals-map-fetch-failed');
        return [];
      }),
    ]);
    const mapped = mapStreams(streams);
    const polyline = buildPolylineFromLatLngs(latlngs);
    if (!mapped) {
      return { status: 'no_streams', streams: null, polyline };
    }
    return { status: 'ok', streams: mapped, polyline };
  } catch (error) {
    logger.warn({ error, externalId, logContext }, 'intervals-streams-fetch-failed');
    return { status: 'error', streams: null };
  }
}
