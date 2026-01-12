import { describe, it, expect } from 'vitest';
import {
  prepareAltitudeData,
  preparePaceData,
  prepareHeartrateData,
  prepareCadenceData,
  getAvailableStreams,
  calculateStreamAverage,
  STREAM_CONFIGS,
} from '../stream-charts';
import type { StravaStreamSet } from '@/lib/types';

describe('streams utilities', () => {
  const createMockStream = (data: number[]) => ({
    data,
    series_type: 'distance' as const,
    original_size: data.length,
    resolution: 'high' as const,
  });

  describe('prepareAltitudeData', () => {
    it('should prepare altitude data correctly', () => {
      const streams: StravaStreamSet = {
        altitude: createMockStream([100, 110, 120]),
        distance: createMockStream([0, 500, 1000]),
        time: createMockStream([0, 60, 120]),
      };

      const result = prepareAltitudeData(streams);

      expect(result).toHaveLength(3);
      expect(result[0].value).toBe(100);
      expect(result[1].distance).toBe(0.5);
      expect(result[2].formattedValue).toBe('120 m');
    });

    it('should return empty array when no altitude data', () => {
      const streams: StravaStreamSet = {
        distance: createMockStream([0, 500, 1000]),
      };

      expect(prepareAltitudeData(streams)).toEqual([]);
    });
  });

  describe('preparePaceData', () => {
    it('should prepare pace data correctly', () => {
      const streams: StravaStreamSet = {
        velocity_smooth: createMockStream([2.78, 3.0, 2.5]),
        distance: createMockStream([0, 500, 1000]),
        time: createMockStream([0, 60, 120]),
      };

      const result = preparePaceData(streams);

      expect(result).toHaveLength(3);
      expect(result[0].distance).toBe(0);
      expect(result[1].distance).toBe(0.5);
    });

    it('should return empty array when no velocity data', () => {
      const streams: StravaStreamSet = {
        distance: createMockStream([0, 500, 1000]),
      };

      expect(preparePaceData(streams)).toEqual([]);
    });
  });

  describe('prepareHeartrateData', () => {
    it('should prepare heart rate data correctly with smoothing', () => {
      const streams: StravaStreamSet = {
        heartrate: createMockStream([140, 150, 160]),
        distance: createMockStream([0, 500, 1000]),
        time: createMockStream([0, 60, 120]),
      };

      const result = prepareHeartrateData(streams);

      expect(result).toHaveLength(3);
      // With rolling average window of 7, small datasets get averaged
      expect(result[0].value).toBeCloseTo(150, 0);
      expect(result[1].formattedValue).toBe('150 bpm');
    });

    it('should return empty array when no heart rate data', () => {
      const streams: StravaStreamSet = {
        distance: createMockStream([0, 500, 1000]),
      };

      expect(prepareHeartrateData(streams)).toEqual([]);
    });
  });

  describe('prepareCadenceData', () => {
    it('should prepare cadence data with smoothing and doubled values (both legs)', () => {
      const streams: StravaStreamSet = {
        cadence: createMockStream([75, 80, 85]), // Strava gives single leg
        distance: createMockStream([0, 500, 1000]),
        time: createMockStream([0, 60, 120]),
      };

      const result = prepareCadenceData(streams);

      expect(result).toHaveLength(3);
      // With rolling average window of 25, small datasets get averaged
      expect(result[0].value).toBeCloseTo(80, 0);
      expect(result[0].formattedValue).toBe('160 ppm'); // Doubled for both legs
      expect(result[1].formattedValue).toBe('160 ppm');
    });

    it('should return empty array when no cadence data', () => {
      const streams: StravaStreamSet = {
        distance: createMockStream([0, 500, 1000]),
      };

      expect(prepareCadenceData(streams)).toEqual([]);
    });
  });

  describe('getAvailableStreams', () => {
    it('should return all available streams', () => {
      const streams: StravaStreamSet = {
        altitude: createMockStream([100, 110]),
        velocity_smooth: createMockStream([2.5, 3.0]),
        heartrate: createMockStream([140, 150]),
        cadence: createMockStream([75, 80]),
        distance: createMockStream([0, 500]),
      };

      const result = getAvailableStreams(streams);

      expect(result).toContain('altitude');
      expect(result).toContain('pace');
      expect(result).toContain('heartrate');
      expect(result).toContain('cadence');
      expect(result).toHaveLength(4);
    });

    it('should return only available streams', () => {
      const streams: StravaStreamSet = {
        velocity_smooth: createMockStream([2.5, 3.0]),
        distance: createMockStream([0, 500]),
      };

      const result = getAvailableStreams(streams);

      expect(result).toContain('pace');
      expect(result).not.toContain('altitude');
      expect(result).not.toContain('heartrate');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for empty streams', () => {
      expect(getAvailableStreams({})).toEqual([]);
    });
  });

  describe('calculateStreamAverage', () => {
    it('should calculate average correctly', () => {
      const data = [
        { distance: 0, time: 0, value: 100, formattedValue: '100' },
        { distance: 1, time: 60, value: 200, formattedValue: '200' },
        { distance: 2, time: 120, value: 300, formattedValue: '300' },
      ];

      expect(calculateStreamAverage(data)).toBe(200);
    });

    it('should return 0 for empty array', () => {
      expect(calculateStreamAverage([])).toBe(0);
    });
  });

  describe('STREAM_CONFIGS', () => {
    it('should have all required stream configs', () => {
      expect(STREAM_CONFIGS).toHaveProperty('altitude');
      expect(STREAM_CONFIGS).toHaveProperty('pace');
      expect(STREAM_CONFIGS).toHaveProperty('heartrate');
      expect(STREAM_CONFIGS).toHaveProperty('cadence');
    });

    it('should have correct config structure', () => {
      const altitudeConfig = STREAM_CONFIGS.altitude;
      
      expect(altitudeConfig.key).toBe('altitude');
      expect(altitudeConfig.label).toBe('Altitude');
      expect(altitudeConfig.unit).toBe('m');
      expect(altitudeConfig.color).toBeDefined();
      expect(altitudeConfig.formatValue).toBeInstanceOf(Function);
      expect(altitudeConfig.formatTooltip).toBeInstanceOf(Function);
    });

    it('should format values correctly', () => {
      expect(STREAM_CONFIGS.altitude.formatValue(123.5)).toBe('124');
      expect(STREAM_CONFIGS.heartrate.formatTooltip(150)).toBe('150 bpm');
      expect(STREAM_CONFIGS.cadence.formatTooltip(80)).toBe('160 ppm'); // Doubled
    });
  });
});
