import 'server-only';
import { decodePolyline } from '@/lib/utils/geo/polyline';
import { getHistoricalWeather } from '@/server/services/weather';
import type { WeatherData } from '@/lib/types/weather';
import { logger } from '@/server/infrastructure/logger';
import { updateSessionWeather } from './sessions-write';
import { validateStravaMap } from '@/lib/validation/strava';
import { pMap } from '@/lib/utils/async';

export async function enrichSessionWithWeather(
  stravaData: unknown,
  fallbackDate: Date
): Promise<WeatherData | null> {
  if (!stravaData) return null;

  try {
    const validatedData = validateStravaMap(stravaData);
    if (!validatedData) return null;

    const polyline = validatedData.map?.summary_polyline;
    if (!polyline) return null;

    const coordinates = decodePolyline(polyline);
    if (coordinates.length === 0) return null;

    const midpointIndex = Math.floor(coordinates.length / 2);
    const [lat, lng] = coordinates[midpointIndex];
    
    const activityDate = validatedData.start_date 
      ? new Date(validatedData.start_date) 
      : fallbackDate;
    
    return await getHistoricalWeather(lat, lng, activityDate.toISOString());
  } catch (error) {
    logger.warn({ error, fallbackDate }, 'Failed to enrich session with weather');
    return null;
  }
}

export interface WeatherEnrichmentTask {
  id: string;
  stravaData: unknown;
  date: string;
}

export interface BulkWeatherEnrichmentResult {
  enrichedIds: string[];
  failedIds: string[];
  missingStravaIds: string[];
}

export async function enrichBulkWeather(
  workouts: WeatherEnrichmentTask[],
  userId: string,
  options?: { concurrency?: number }
): Promise<BulkWeatherEnrichmentResult> {
  const enrichedIds: string[] = [];
  const failedIds: string[] = [];
  const missingStravaIds: string[] = [];
  const concurrency = options?.concurrency ?? 3;

  await pMap(
    workouts,
    async (workout) => {
      try {
        const validated = validateStravaMap(workout.stravaData);
        if (!validated?.map?.summary_polyline) {
          missingStravaIds.push(workout.id);
          return;
        }

        const weather = await enrichSessionWithWeather(workout.stravaData, new Date(workout.date));
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

  return { enrichedIds, failedIds, missingStravaIds };
}
