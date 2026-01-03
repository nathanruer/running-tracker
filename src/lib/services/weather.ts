import type { WeatherData } from '@/lib/types/weather';
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';

export { WeatherData };

const weatherCache = new Map<string, WeatherData | null>();

/**
 * Clears the weather cache (useful for testing)
 */
export function clearWeatherCache(): void {
  weatherCache.clear();
}

/**
 * Validates that coordinates are within valid ranges
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Weather codes interpretation (WMO code)
 */
export const getWeatherLabel = (code: number): string => {
  if (code === 0) return 'Ensoleillé';
  if (code === 1) return 'Majoritairement clair';
  if (code === 2) return 'Partiellement nuageux';
  if (code === 3) return 'Nuageux';
  if (code >= 45 && code <= 48) return 'Brouillard';
  if (code >= 51 && code <= 55) return 'Bruine';
  if (code >= 61 && code <= 65) return 'Pluie';
  if (code >= 71 && code <= 75) return 'Neige';
  if (code >= 80 && code <= 82) return 'Averses';
  if (code >= 95 && code <= 99) return 'Orage';
  return 'Inconnu';
};

export async function getHistoricalWeather(
  lat: number,
  lng: number,
  dateStr: string
): Promise<WeatherData | null> {
  if (!isValidCoordinate(lat, lng)) {
    return null;
  }

  try {
    const date = new Date(dateStr);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const dateYMD = `${yyyy}-${mm}-${dd}`;

    const cacheKey = `${lat},${lng},${dateYMD}`;
    if (weatherCache.has(cacheKey)) {
      return weatherCache.get(cacheKey) ?? null;
    }

    const hour = date.getUTCHours();

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateYMD}&end_date=${dateYMD}&hourly=temperature_2m,precipitation,weathercode,windspeed_10m`;

    const res = await fetchWithTimeout(url, {}, 5000);
    if (!res.ok) throw new Error('Weather API error');

    const data = await res.json();

    if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
      weatherCache.set(cacheKey, null);
      return null;
    }

    const index = hour;

    if (index >= data.hourly.temperature_2m.length) {
      weatherCache.set(cacheKey, null);
      return null;
    }

    const result: WeatherData = {
      conditionCode: data.hourly.weathercode[index],
      temperature: data.hourly.temperature_2m[index],
      windSpeed: data.hourly.windspeed_10m[index],
      precipitation: data.hourly.precipitation[index],
      timestamp: hour,
    };

    weatherCache.set(cacheKey, result);
    return result;

  } catch {
    return null;
  }
}

