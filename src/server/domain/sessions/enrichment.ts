import 'server-only';
import { decodePolyline } from '@/lib/utils/geo/polyline';
import { getHistoricalWeather } from '@/server/services/weather';
import type { WeatherData } from '@/lib/types/weather';
import { logger } from '@/server/infrastructure/logger';
import { updateSessionWeather } from './sessions-write';
import { validateStravaMap } from '@/lib/validation/strava';

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

export async function enrichBulkWeather(
  workouts: Array<{ id: string; stravaData: unknown; date: string }>,
  userId: string,
): Promise<void> {
  for (const workout of workouts) {
    try {
      const weather = await enrichSessionWithWeather(workout.stravaData, new Date(workout.date));
      if (weather) {
        await updateSessionWeather(workout.id, userId, weather as Record<string, unknown>);
      }
    } catch (error) {
      logger.warn({ error, workoutId: workout.id }, 'Failed to enrich bulk weather');
    }
  }
}
