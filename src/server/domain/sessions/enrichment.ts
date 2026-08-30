import 'server-only';
import { decodePolyline } from '@/lib/utils/geo/polyline';
import { getHistoricalWeather } from '@/server/services/weather';
import type { WeatherData } from '@/lib/types/weather';
import { logger } from '@/server/infrastructure/logger';
import { updateSessionWeather } from './sessions-write';
import { pMap } from '@/lib/utils/async';

export interface WeatherEnrichmentInput {
  routePolyline: string | null | undefined;
  startedAt: Date | string;
}

/** Weather at the midpoint of the route, at the session start. Null without a route. */
export async function enrichSessionWithWeather({ routePolyline, startedAt }: WeatherEnrichmentInput): Promise<WeatherData | null> {
  if (!routePolyline) return null;

  try {
    const coordinates = decodePolyline(routePolyline);
    if (coordinates.length === 0) return null;

    const midpointIndex = Math.floor(coordinates.length / 2);
    const [lat, lng] = coordinates[midpointIndex];
    const activityDate = startedAt instanceof Date ? startedAt : new Date(startedAt);

    return await getHistoricalWeather(lat, lng, activityDate.toISOString());
  } catch (error) {
    logger.warn({ error, startedAt }, 'Failed to enrich session with weather');
    return null;
  }
}

export interface WeatherEnrichmentTask extends WeatherEnrichmentInput {
  id: string;
}

export interface BulkWeatherEnrichmentResult {
  enrichedIds: string[];
  failedIds: string[];
  missingRouteIds: string[];
}

export async function enrichBulkWeather(
  workouts: WeatherEnrichmentTask[],
  userId: string,
  options?: { concurrency?: number }
): Promise<BulkWeatherEnrichmentResult> {
  const enrichedIds: string[] = [];
  const failedIds: string[] = [];
  const missingRouteIds: string[] = [];
  const concurrency = options?.concurrency ?? 3;

  await pMap(
    workouts,
    async (workout) => {
      try {
        if (!workout.routePolyline) {
          missingRouteIds.push(workout.id);
          return;
        }

        const weather = await enrichSessionWithWeather(workout);
        if (!weather) {
          failedIds.push(workout.id);
          return;
        }

        const updated = await updateSessionWeather(workout.id, userId, weather as Record<string, unknown>);
        if (!updated) {
          failedIds.push(workout.id);
          return;
        }

        enrichedIds.push(workout.id);
      } catch (error) {
        logger.warn({ error, workoutId: workout.id }, 'Failed to enrich bulk weather');
        failedIds.push(workout.id);
      }
    },
    concurrency
  );

  return { enrichedIds, failedIds, missingRouteIds };
}
