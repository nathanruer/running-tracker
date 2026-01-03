import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrichSessionWithWeather } from '../enrichment';
import { decodePolyline } from '@/lib/utils/polyline';
import { getHistoricalWeather } from '@/lib/services/weather';
import { logger } from '@/lib/infrastructure/logger';

vi.mock('@/lib/utils/polyline', () => ({
  decodePolyline: vi.fn(),
}));

vi.mock('@/lib/services/weather', () => ({
  getHistoricalWeather: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('enrichSessionWithWeather', () => {
  const mockDate = new Date('2024-01-01T10:00:00.000Z');
  const mockWeatherData = {
    conditionCode: 1,
    temperature: 15,
    windSpeed: 10,
    precipitation: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when stravaData is null', async () => {
    const result = await enrichSessionWithWeather(null, mockDate);
    expect(result).toBeNull();
    expect(decodePolyline).not.toHaveBeenCalled();
  });

  it('should return null when stravaData is undefined', async () => {
    const result = await enrichSessionWithWeather(undefined, mockDate);
    expect(result).toBeNull();
    expect(decodePolyline).not.toHaveBeenCalled();
  });

  it('should return null when stravaData has no map', async () => {
    const stravaData = { id: 12345, name: 'Test Run' };
    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toBeNull();
    expect(decodePolyline).not.toHaveBeenCalled();
  });

  it('should return null when stravaData has no polyline', async () => {
    const stravaData = {
      map: {
        id: 'map123',
      },
    };
    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toBeNull();
    expect(decodePolyline).not.toHaveBeenCalled();
  });

  it('should return null when polyline decodes to empty array', async () => {
    const stravaData = {
      map: {
        summary_polyline: 'empty_polyline',
      },
    };

    vi.mocked(decodePolyline).mockReturnValue([]);

    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toBeNull();
    expect(decodePolyline).toHaveBeenCalledWith('empty_polyline');
    expect(getHistoricalWeather).not.toHaveBeenCalled();
  });

  it('should return weather data when stravaData has valid polyline', async () => {
    const stravaData = {
      map: {
        summary_polyline: 'valid_polyline',
      },
    };

    const mockCoordinates: [number, number][] = [[48.8566, 2.3522]];
    vi.mocked(decodePolyline).mockReturnValue(mockCoordinates);
    vi.mocked(getHistoricalWeather).mockResolvedValue(mockWeatherData);

    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toEqual(mockWeatherData);
    expect(decodePolyline).toHaveBeenCalledWith('valid_polyline');
    expect(getHistoricalWeather).toHaveBeenCalledWith(
      48.8566,
      2.3522,
      mockDate.toISOString()
    );
  });

  it('should use midpoint coordinate when polyline has multiple points', async () => {
    const stravaData = {
      map: {
        summary_polyline: 'multi_point_polyline',
      },
    };

    const mockCoordinates: [number, number][] = [
      [48.8566, 2.3522],
      [48.8570, 2.3530],
      [48.8580, 2.3540],
    ];

    vi.mocked(decodePolyline).mockReturnValue(mockCoordinates);
    vi.mocked(getHistoricalWeather).mockResolvedValue(mockWeatherData);

    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toEqual(mockWeatherData);
    // Should use midpoint: Math.floor(3 / 2) = 1
    expect(getHistoricalWeather).toHaveBeenCalledWith(
      48.8570,
      2.3530,
      mockDate.toISOString()
    );
  });

  it('should return null and log warning when decodePolyline throws error', async () => {
    const stravaData = {
      map: {
        summary_polyline: 'invalid_polyline',
      },
    };

    const mockError = new Error('Invalid polyline format');
    vi.mocked(decodePolyline).mockImplementation(() => {
      throw mockError;
    });

    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      { error: mockError, fallbackDate: mockDate },
      'Failed to enrich session with weather'
    );
  });

  it('should return null and log warning when getHistoricalWeather fails', async () => {
    const stravaData = {
      map: {
        summary_polyline: 'valid_polyline',
      },
    };

    const mockCoordinates: [number, number][] = [[48.8566, 2.3522]];
    const mockError = new Error('Weather API error');

    vi.mocked(decodePolyline).mockReturnValue(mockCoordinates);
    vi.mocked(getHistoricalWeather).mockRejectedValue(mockError);

    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      { error: mockError, fallbackDate: mockDate },
      'Failed to enrich session with weather'
    );
  });

  it('should handle stravaData with extra fields gracefully', async () => {
    const stravaData = {
      id: 12345,
      name: 'Test Run',
      distance: 10000,
      map: {
        id: 'map123',
        summary_polyline: 'valid_polyline',
      },
      other_field: 'ignored',
    };

    const mockCoordinates: [number, number][] = [[48.8566, 2.3522]];
    vi.mocked(decodePolyline).mockReturnValue(mockCoordinates);
    vi.mocked(getHistoricalWeather).mockResolvedValue(mockWeatherData);

    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toEqual(mockWeatherData);
  });

  it('should return null when getHistoricalWeather returns null', async () => {
    const stravaData = {
      map: {
        summary_polyline: 'valid_polyline',
      },
    };

    const mockCoordinates: [number, number][] = [[48.8566, 2.3522]];
    vi.mocked(decodePolyline).mockReturnValue(mockCoordinates);
    vi.mocked(getHistoricalWeather).mockResolvedValue(null);

    const result = await enrichSessionWithWeather(stravaData, mockDate);

    expect(result).toBeNull();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
