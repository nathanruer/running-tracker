import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
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
import { enrichBulkWeather } from '@/server/domain/sessions/enrichment';

export const runtime = 'nodejs';

const DEFAULT_LOOKBACK_DAYS = 30;
const CROSS_SOURCE_TIME_WINDOW_MS = 3 * 60 * 1000;
const CROSS_SOURCE_DISTANCE_TOLERANCE = 0.05;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 19);
}

async function findExistingWorkoutWindows(userId: string, oldest: Date) {
  const workouts = await prisma.workouts.findMany({
    where: { userId, date: { gte: oldest } },
    select: {
      date: true,
      workout_metrics_raw: { select: { distanceMeters: true } },
    },
  });

  return workouts.map((w) => ({
    time: w.date.getTime(),
    distanceMeters: w.workout_metrics_raw?.distanceMeters ?? null,
  }));
}

function matchesExistingWorkout(
  existing: Array<{ time: number; distanceMeters: number | null }>,
  activityDate: Date,
  activityDistanceMeters: number
): boolean {
  return existing.some((w) => {
    if (Math.abs(w.time - activityDate.getTime()) > CROSS_SOURCE_TIME_WINDOW_MS) return false;
    if (w.distanceMeters == null || activityDistanceMeters <= 0) return true;
    const ratio = Math.abs(w.distanceMeters - activityDistanceMeters) / activityDistanceMeters;
    return ratio <= CROSS_SOURCE_DISTANCE_TOLERANCE;
  });
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

      const oldest = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const newest = new Date(Date.now() + 24 * 60 * 60 * 1000);

      try {
        const [activities, importedIds, existingWindows] = await Promise.all([
          getIntervalsActivities(toIsoDate(oldest), toIsoDate(newest)),
          getImportedExternalIds(userId, INTERVALS_SOURCE),
          findExistingWorkoutWindows(userId, new Date(oldest.getTime() - 24 * 60 * 60 * 1000)),
        ]);

        const runs = activities.filter((a) => IMPORTABLE_TYPES.has(a.type ?? ''));

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
