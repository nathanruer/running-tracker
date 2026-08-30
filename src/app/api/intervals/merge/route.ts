import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import {
  getIntervalsApiKey,
  getIntervalsActivity,
  getIntervalsActivityStreams,
  getIntervalsActivityMap,
  getIntervalsActivityIntervals,
  mergeIntervalsActivities,
} from '@/server/services/intervals';

export const runtime = 'nodejs';

const MAX_PARTS = 5;

const mergeSchema = z.object({
  externalIds: z.array(z.string().min(1)).min(2).max(MAX_PARTS),
});

/** Builds the single session out of several recordings, for review in the form before saving. */
export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    mergeSchema,
    async (data, userId) => {
      const apiKey = await getIntervalsApiKey(userId);
      if (!apiKey) {
        return NextResponse.json(
          { error: 'intervals.icu non configuré : connecte ton compte depuis Profil → Compte.' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const parts = await Promise.all(
        data.externalIds.map(async (externalId) => {
          const [activity, streams, latlngs, intervals] = await Promise.all([
            getIntervalsActivity(apiKey, externalId),
            getIntervalsActivityStreams(apiKey, externalId).catch(() => []),
            getIntervalsActivityMap(apiKey, externalId).catch(() => []),
            getIntervalsActivityIntervals(apiKey, externalId).catch(() => []),
          ]);
          return { activity, streams, latlngs, intervals };
        })
      );

      // The series are rebuilt server-side when the session is saved: no need to ship them for review.
      return NextResponse.json({ activity: { ...mergeIntervalsActivities(parts), streams: null } });
    },
    { logContext: 'merge-intervals-activities' }
  );
}
