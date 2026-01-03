import { decodePolyline } from '@/lib/utils/polyline';
import { getHistoricalWeather, WeatherData } from '@/lib/services/weather';
import { logger } from '@/lib/infrastructure/logger';
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
