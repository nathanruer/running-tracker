import 'server-only';
import { prisma } from '@/server/database';
import { enrichBulkWeather, type WeatherEnrichmentTask } from './enrichment';

export interface BulkWeatherEnrichmentSummary {
  requested: number;
  enriched: number;
  alreadyHasWeather: number;
  missingStrava: number;
  failed: number;
  notFound: number;
}

export interface BulkWeatherEnrichmentResult {
  summary: BulkWeatherEnrichmentSummary;
  ids: {
    enriched: string[];
    alreadyHasWeather: string[];
    missingStrava: string[];
    failed: string[];
    notFound: string[];
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

export async function bulkEnrichWeatherForIds(
  userId: string,
  ids: string[],
  options?: { concurrency?: number }
): Promise<BulkWeatherEnrichmentResult> {
  const requestedIds = uniqueIds(ids);

  if (requestedIds.length === 0) {
    return {
      summary: {
        requested: 0,
        enriched: 0,
        alreadyHasWeather: 0,
        missingStrava: 0,
        failed: 0,
        notFound: 0,
      },
      ids: {
        enriched: [],
        alreadyHasWeather: [],
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
      date: true,
      weather_observations: { select: { id: true } },
      external_activities: {
        select: {
          source: true,
          external_payloads: { select: { payload: true } },
        },
      },
    },
  });

  const foundIds = new Set(workouts.map((workout) => workout.id));
  const notFound = requestedIds.filter((id) => !foundIds.has(id));

  const alreadyHasWeather: string[] = [];
  const missingStrava: string[] = [];
  const tasks: WeatherEnrichmentTask[] = [];

  for (const workout of workouts) {
    if (workout.weather_observations) {
      alreadyHasWeather.push(workout.id);
      continue;
    }

    const stravaActivity = workout.external_activities.find(
      (activity) => activity.source === 'strava' && activity.external_payloads?.payload
    );

    if (!stravaActivity || !workout.date) {
      missingStrava.push(workout.id);
      continue;
    }

    tasks.push({
      id: workout.id,
      stravaData: stravaActivity.external_payloads?.payload,
      date: workout.date.toISOString(),
    });
  }

  const enrichmentResult = await enrichBulkWeather(tasks, userId, options);

  const missingStravaCombined = [...missingStrava, ...enrichmentResult.missingStravaIds];

  return {
    summary: {
      requested: requestedIds.length,
      enriched: enrichmentResult.enrichedIds.length,
      alreadyHasWeather: alreadyHasWeather.length,
      missingStrava: missingStravaCombined.length,
      failed: enrichmentResult.failedIds.length,
      notFound: notFound.length,
    },
    ids: {
      enriched: enrichmentResult.enrichedIds,
      alreadyHasWeather,
      missingStrava: missingStravaCombined,
      failed: enrichmentResult.failedIds,
      notFound,
    },
  };
}
