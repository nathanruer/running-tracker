import 'server-only';
import { prisma } from '@/server/database';
import { enrichBulkWeather, type WeatherEnrichmentTask } from './enrichment';

export interface BulkWeatherEnrichmentSummary {
  requested: number;
  enriched: number;
  alreadyHasWeather: number;
  missingSource: number;
  failed: number;
  notFound: number;
}

export interface BulkWeatherEnrichmentResult {
  summary: BulkWeatherEnrichmentSummary;
  ids: {
    enriched: string[];
    alreadyHasWeather: string[];
    missingSource: string[];
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
        missingSource: 0,
        failed: 0,
        notFound: 0,
      },
      ids: {
        enriched: [],
        alreadyHasWeather: [],
        missingSource: [],
        failed: [],
        notFound: [],
      },
    };
  }

  const workouts = await prisma.workouts.findMany({
    where: { userId, id: { in: requestedIds } },
    select: {
      id: true,
      startedAt: true,
      routePolyline: true,
      weather_observations: { select: { id: true } },
    },
  });

  const foundIds = new Set(workouts.map((workout) => workout.id));
  const notFound = requestedIds.filter((id) => !foundIds.has(id));

  const alreadyHasWeather: string[] = [];
  const missingSource: string[] = [];
  const tasks: WeatherEnrichmentTask[] = [];

  for (const workout of workouts) {
    if (workout.weather_observations) {
      alreadyHasWeather.push(workout.id);
      continue;
    }

    if (!workout.routePolyline) {
      missingSource.push(workout.id);
      continue;
    }

    tasks.push({
      id: workout.id,
      routePolyline: workout.routePolyline,
      startedAt: workout.startedAt,
    });
  }

  const enrichmentResult = await enrichBulkWeather(tasks, userId, options);

  const missingSourceCombined = [...missingSource, ...enrichmentResult.missingRouteIds];

  return {
    summary: {
      requested: requestedIds.length,
      enriched: enrichmentResult.enrichedIds.length,
      alreadyHasWeather: alreadyHasWeather.length,
      missingSource: missingSourceCombined.length,
      failed: enrichmentResult.failedIds.length,
      notFound: notFound.length,
    },
    ids: {
      enriched: enrichmentResult.enrichedIds,
      alreadyHasWeather,
      missingSource: missingSourceCombined,
      failed: enrichmentResult.failedIds,
      notFound,
    },
  };
}
