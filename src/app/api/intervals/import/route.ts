import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { logger } from '@/server/infrastructure/logger';
import {
  getIntervalsActivities,
  getIntervalsActivityStreams,
  isIntervalsConfigured,
  mapIntervalsActivityToSessionPayload,
  IMPORTABLE_TYPES,
  INTERVALS_SOURCE,
} from '@/server/services/intervals';
import {
  createCompletedSession,
  DuplicateExternalActivityError,
  logSessionWriteError,
  recalculateSessionNumbers,
} from '@/server/domain/sessions/sessions-write';
import { getImportedExternalIds } from '@/server/domain/sessions/sessions-read';
import {
  findExistingWorkoutWindows,
  matchesExistingWorkout,
} from '@/server/domain/sessions/import-dedup';
import { enrichBulkWeather } from '@/server/domain/sessions/enrichment';

export const runtime = 'nodejs';

const DEFAULT_LOOKBACK_DAYS = 30;
const SELECTION_HISTORY_YEARS = 3;
const MAX_SELECTION = 100;

const importBodySchema = z.object({
  externalIds: z.array(z.string().min(1)).max(MAX_SELECTION).optional(),
});

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 19);
}

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      if (!isIntervalsConfigured()) {
        return NextResponse.json(
          { error: 'intervals.icu non configuré (INTERVALS_ICU_API_KEY manquante)' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const rawBody = await request.json().catch(() => ({}));
      const parsedBody = importBodySchema.safeParse(rawBody ?? {});
      if (!parsedBody.success) {
        return NextResponse.json(
          { error: `Sélection invalide (maximum ${MAX_SELECTION} activités par lot)` },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
      const selection = parsedBody.data.externalIds;

      const oldest = selection
        ? (() => { const d = new Date(); d.setFullYear(d.getFullYear() - SELECTION_HISTORY_YEARS); return d; })()
        : new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const newest = new Date(Date.now() + 24 * 60 * 60 * 1000);

      try {
        const [activities, importedIds, existingWindows] = await Promise.all([
          getIntervalsActivities(toIsoDate(oldest), toIsoDate(newest)),
          getImportedExternalIds(userId, INTERVALS_SOURCE),
          findExistingWorkoutWindows(userId, new Date(oldest.getTime() - 24 * 60 * 60 * 1000)),
        ]);

        const selectedIds = selection ? new Set(selection) : null;
        const runs = activities.filter(
          (a) => IMPORTABLE_TYPES.has(a.type ?? '') && (!selectedIds || selectedIds.has(a.id))
        );

        let imported = 0;
        let skipped = 0;
        const weatherQueue: Array<{ id: string; stravaData: unknown; date: string }> = [];

        for (const activity of runs) {
          if (importedIds.has(activity.id)) {
            skipped++;
            continue;
          }

          const activityDate = new Date(activity.start_date_local);
          if (matchesExistingWorkout(existingWindows, activityDate, activity.distance ?? 0)) {
            skipped++;
            continue;
          }

          const streams = await getIntervalsActivityStreams(activity.id).catch((error) => {
            logger.warn({ error, activityId: activity.id }, 'intervals-streams-fetch-failed');
            return [];
          });

          const payload = mapIntervalsActivityToSessionPayload(activity, streams);

          try {
            const workout = await createCompletedSession(payload, userId, { skipRecalculate: true });
            imported++;
            importedIds.add(activity.id);
            weatherQueue.push({ id: workout.id, stravaData: payload.stravaData, date: payload.date });
          } catch (error) {
            if (error instanceof DuplicateExternalActivityError) {
              skipped++;
              continue;
            }
            throw error;
          }
        }

        if (imported > 0) {
          await recalculateSessionNumbers(userId);
        }

        const response = NextResponse.json(
          { imported, skipped, total: runs.length },
          { status: imported > 0 ? HTTP_STATUS.CREATED : HTTP_STATUS.OK }
        );

        if (weatherQueue.length > 0) {
          try {
            await enrichBulkWeather(weatherQueue, userId, { concurrency: 3 });
          } catch (error) {
            logger.warn({ error, userId }, 'Failed to enrich intervals import weather');
          }
        }

        return response;
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'intervals-import' });
        return NextResponse.json(
          { error: 'Erreur lors de l\'import depuis intervals.icu.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'intervals-import' }
  );
}
