import 'server-only';
import { prisma } from '@/server/database';
import { logger } from '@/server/infrastructure/logger';
import { pMap } from '@/lib/utils/async';
import { fetchStreamsForSessionWithStatus } from '@/server/services/strava';
import { attachRoutePolyline, markSessionNoStreams, updateSessionStreams } from './sessions-write';
import { isStravaActivityLikelyStreamless } from './stream-eligibility';

export interface BulkStreamsEnrichmentSummary {
  requested: number;
  enriched: number;
  alreadyHasStreams: number;
  missingStrava: number;
  failed: number;
  notFound: number;
}

export interface BulkStreamsEnrichmentResult {
  summary: BulkStreamsEnrichmentSummary;
  ids: {
    enriched: string[];
    alreadyHasStreams: string[];
    missingStrava: string[];
    failed: string[];
    notFound: string[];
  };
}

interface StreamsEnrichmentTask {
  id: string;
  source: string;
  externalId: string;
  polylineOnly?: boolean;
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

export async function bulkEnrichStreamsForIds(
  userId: string,
  ids: string[],
  options?: { concurrency?: number }
): Promise<BulkStreamsEnrichmentResult> {
  const requestedIds = uniqueIds(ids);

  if (requestedIds.length === 0) {
    return {
      summary: {
        requested: 0,
        enriched: 0,
        alreadyHasStreams: 0,
        missingStrava: 0,
        failed: 0,
        notFound: 0,
      },
      ids: {
        enriched: [],
        alreadyHasStreams: [],
        missingStrava: [],
        failed: [],
        notFound: [],
      },
    };
  }

  const workouts = await prisma.workouts.findMany({
    where: { userId, id: { in: requestedIds } },
    select: {
      id: true,
      routePolyline: true,
      workout_streams_v3: { select: { workoutId: true } },
      external_activities: {
        select: {
          source: true,
          externalId: true,
          sourceStatus: true,
          rawPayload: true,
          streamsStatus: true,
        },
      },
    },
  });

  const foundIds = new Set(workouts.map((workout) => workout.id));
  const notFound = requestedIds.filter((id) => !foundIds.has(id));

  const alreadyHasStreams: string[] = [];
  const missingStrava: string[] = [];
  const failed: string[] = [];
  const enriched: string[] = [];
  const tasks: StreamsEnrichmentTask[] = [];

  for (const workout of workouts) {
    if (workout.workout_streams_v3) {
      const intervalsActivity = workout.external_activities.find(
        (activity) => activity.source === 'intervals_icu' && Boolean(activity.externalId)
      );
      if (intervalsActivity?.externalId && !workout.routePolyline) {
        tasks.push({
          id: workout.id,
          source: intervalsActivity.source,
          externalId: intervalsActivity.externalId,
          polylineOnly: true,
        });
        continue;
      }
      alreadyHasStreams.push(workout.id);
      continue;
    }

    const stravaActivity = workout.external_activities.find(
      (activity) =>
        (activity.source === 'strava' || activity.source === 'intervals_icu') &&
        Boolean(activity.externalId)
    );

    if (!stravaActivity?.externalId) {
      missingStrava.push(workout.id);
      continue;
    }

    const likelyStreamlessFromPayload = isStravaActivityLikelyStreamless(stravaActivity.rawPayload);
    const knownStreamless =
      stravaActivity.streamsStatus === 'not_applicable' || stravaActivity.sourceStatus === 'no_streams';

    if (knownStreamless || likelyStreamlessFromPayload) {
      if (!knownStreamless) {
        await markSessionNoStreams(workout.id, userId);
      }
      alreadyHasStreams.push(workout.id);
      continue;
    }

    tasks.push({
      id: workout.id,
      source: stravaActivity.source,
      externalId: stravaActivity.externalId,
    });
  }

  const concurrency = options?.concurrency ?? 2;

  await pMap(
    tasks,
    async (task) => {
      try {
        const streamResult = await fetchStreamsForSessionWithStatus(
          task.source,
          task.externalId,
          userId,
          'bulk-enrich-streams'
        );

        if (task.polylineOnly) {
          if (streamResult.status === 'ok' && streamResult.polyline) {
            await attachRoutePolyline(task.id, userId, streamResult.polyline);
            enriched.push(task.id);
          } else {
            alreadyHasStreams.push(task.id);
          }
          return;
        }

        if (streamResult.status === 'no_streams') {
          await markSessionNoStreams(task.id, userId);
          alreadyHasStreams.push(task.id);
          return;
        }

        if (streamResult.status !== 'ok' || !streamResult.streams) {
          failed.push(task.id);
          return;
        }

        const updatedId = await updateSessionStreams(
          task.id,
          userId,
          streamResult.streams as Record<string, unknown>
        );

        if (!updatedId) {
          failed.push(task.id);
          return;
        }

        if (streamResult.polyline) {
          await attachRoutePolyline(task.id, userId, streamResult.polyline);
        }

        enriched.push(task.id);
      } catch (error) {
        logger.warn({ error, workoutId: task.id }, 'Failed to enrich session streams');
        failed.push(task.id);
      }
    },
    concurrency
  );

  return {
    summary: {
      requested: requestedIds.length,
      enriched: enriched.length,
      alreadyHasStreams: alreadyHasStreams.length,
      missingStrava: missingStrava.length,
      failed: failed.length,
      notFound: notFound.length,
    },
    ids: {
      enriched,
      alreadyHasStreams,
      missingStrava,
      failed,
      notFound,
    },
  };
}
