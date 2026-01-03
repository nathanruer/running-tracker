import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHistoricalWeather, getWeatherLabel, clearWeatherCache } from '../weather';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Weather Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWeatherCache();
  });

  describe('getWeatherLabel', () => {
    it('should return correct labels for weather codes', () => {
      expect(getWeatherLabel(0)).toBe('Ensoleillé');
      expect(getWeatherLabel(3)).toBe('Nuageux');
      expect(getWeatherLabel(61)).toBe('Pluie');
      expect(getWeatherLabel(81)).toBe('Averses');
      expect(getWeatherLabel(999)).toBe('Inconnu');
    });
  });

  describe('getHistoricalWeather', () => {
    const defaultCoords = { lat: 48.8566, lng: 2.3522 };
    const defaultDate = '2024-01-01T10:00:00.000Z';

    it('should fetch weather data correctly', async () => {
      const mockResponse = {
        hourly: {
          time: Array(24).fill(0).map((_, i) => `2024-01-01T${String(i).padStart(2, '0')}:00`),
          weathercode: Array(24).fill(0),
          temperature_2m: Array(24).fill(15),
          windspeed_10m: Array(24).fill(10),
          precipitation: Array(24).fill(0),
        }
      };
    
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getHistoricalWeather(defaultCoords.lat, defaultCoords.lng, defaultDate);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('archive-api.open-meteo.com');
      expect(url).toContain(`latitude=${defaultCoords.lat}`);
      expect(url).toContain(`longitude=${defaultCoords.lng}`);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('conditionCode');
    });

    it('should return null if API fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const result = await getHistoricalWeather(defaultCoords.lat, defaultCoords.lng, defaultDate);
      expect(result).toBeNull();
    });

    it('should return null if API returns invalid data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hourly: null }),
      });

      const result = await getHistoricalWeather(defaultCoords.lat, defaultCoords.lng, defaultDate);
      expect(result).toBeNull();
    });

    it('should return null for invalid coordinates', async () => {
      const invalidCoordinates = [
        { lat: 91, lng: 0 },
        { lat: -91, lng: 0 },
        { lat: 0, lng: 181 },
        { lat: 0, lng: -181 },
      ];

      for (const coords of invalidCoordinates) {
        const result = await getHistoricalWeather(coords.lat, coords.lng, defaultDate);
        expect(result).toBeNull();
      }

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should cache weather data and return cached result on subsequent calls', async () => {
      const mockResponse = {
        hourly: {
          time: Array(24).fill(0).map((_, i) => `2024-01-01T${String(i).padStart(2, '0')}:00`),
          weathercode: Array(24).fill(0),
          temperature_2m: Array(24).fill(15),
          windspeed_10m: Array(24).fill(10),
          precipitation: Array(24).fill(0),
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result1 = await getHistoricalWeather(defaultCoords.lat, defaultCoords.lng, defaultDate);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).not.toBeNull();

      const result2 = await getHistoricalWeather(defaultCoords.lat, defaultCoords.lng, defaultDate);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result2).toEqual(result1);
    });

    it('should include timestamp in weather data', async () => {
      const mockResponse = {
        hourly: {
          time: Array(24).fill(0).map((_, i) => `2024-01-01T${String(i).padStart(2, '0')}:00`),
          weathercode: Array(24).fill(0),
          temperature_2m: Array(24).fill(15),
          windspeed_10m: Array(24).fill(10),
          precipitation: Array(24).fill(0),
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getHistoricalWeather(defaultCoords.lat, defaultCoords.lng, defaultDate);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('timestamp', 10); // 10:00 UTC
    });
  });
});
