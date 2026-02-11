import { describe, it, expect } from 'vitest';
import {
  prepareAltitudeData,
  preparePaceData,
  prepareHeartrateData,
  prepareCadenceData,
  getAvailableStreams,
  calculateStreamAverage,
  calculatePaceDomain,
  STREAM_CONFIGS,
} from '../stream-charts';
import type { StravaStreamSet } from '@/lib/types';

describe('streams utilities', () => {
  const createMockStream = (data: number[], resolution: 'low' | 'medium' | 'high' = 'high') => ({
    data,
    series_type: 'distance' as const,
    original_size: data.length,
    resolution,
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

    it('should avoid flattening sparse low-resolution pace streams', () => {
      const streams: StravaStreamSet = {
        velocity_smooth: createMockStream([3.5, 2.0, 3.5], 'low'),
        distance: createMockStream([0, 500, 1000], 'low'),
        time: createMockStream([0, 30, 60], 'low'),
      };

      const result = preparePaceData(streams);

      expect(result).toHaveLength(3);
      // middle point should stay close to raw 2.0 m/s => 500 s/km (8:20)
      expect(result[1].value).toBeGreaterThan(450);
    });

    it('should smooth isolated pause spike at start', () => {
      const streams: StravaStreamSet = {
        velocity_smooth: createMockStream([0.2, 2.8, 2.9, 2.8], 'high'),
        distance: createMockStream([0, 100, 200, 300], 'high'),
        time: createMockStream([0, 5, 10, 15], 'high'),
      };

      const result = preparePaceData(streams);

      expect(result).toHaveLength(4);
      // first point should not keep a huge pause artifact pace
      expect(result[0].value).toBeLessThan(900);
    });

    it('should normalize leading zero velocities instead of displaying start artifact', () => {
      const streams: StravaStreamSet = {
        velocity_smooth: createMockStream([0, 0, 2.5, 2.6, 2.7], 'high'),
        distance: createMockStream([0, 5, 10, 15, 20], 'high'),
        time: createMockStream([0, 1, 2, 3, 4], 'high'),
      };

      const result = preparePaceData(streams);

      expect(result).toHaveLength(5);
      // first points should be close to running pace, not an artificial very slow spike.
      expect(result[0].value).toBeLessThan(500);
      expect(result[1].value).toBeLessThan(500);
    });

    it('should repair short pause segments in the middle of activity', () => {
      const streams: StravaStreamSet = {
        velocity_smooth: createMockStream([2.9, 2.8, 0, 0, 2.8, 2.9], 'high'),
        distance: createMockStream([0, 10, 20, 30, 40, 50], 'high'),
        time: createMockStream([0, 5, 10, 15, 20, 25], 'high'),
      };

      const result = preparePaceData(streams);

      expect(result).toHaveLength(6);
      // pause points should be brought back near running pace to avoid spikes.
      expect(result[2].value).toBeLessThan(500);
      expect(result[3].value).toBeLessThan(500);
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

    it('should format altitude tooltip correctly', () => {
      expect(STREAM_CONFIGS.altitude.formatTooltip(123.5)).toBe('124 m');
    });

    it('should format pace value correctly', () => {
      // 300 seconds per km = 5:00 min/km
      const formatted = STREAM_CONFIGS.pace.formatValue(300);
      expect(formatted).toBe('5:00');
    });

    it('should format pace tooltip correctly', () => {
      // 330 seconds per km = 5:30 min/km
      const formatted = STREAM_CONFIGS.pace.formatTooltip(330);
      expect(formatted).toBe('5:30 /km');
    });

    it('should format heartrate value correctly', () => {
      expect(STREAM_CONFIGS.heartrate.formatValue(155.8)).toBe('156');
    });

    it('should format cadence value correctly (doubled)', () => {
      // Strava gives single leg, so value is doubled
      expect(STREAM_CONFIGS.cadence.formatValue(85)).toBe('170');
    });
  });

  describe('calculatePaceDomain', () => {
    it('should return undefined for empty data', () => {
      expect(calculatePaceDomain([])).toBeUndefined();
    });

    it('should calculate domain with padding', () => {
      const data = [
        { distance: 0, time: 0, value: 300, formattedValue: '5:00' },
        { distance: 1, time: 60, value: 330, formattedValue: '5:30' },
        { distance: 2, time: 120, value: 360, formattedValue: '6:00' },
      ];

      const result = calculatePaceDomain(data);

      expect(result).toBeDefined();
      expect(result![0]).toBeLessThan(300); // min - padding
      expect(result![1]).toBeGreaterThan(360); // max + padding
    });

    it('should handle single data point', () => {
      const data = [
        { distance: 0, time: 0, value: 300, formattedValue: '5:00' },
      ];

      const result = calculatePaceDomain(data);

      expect(result).toBeDefined();
      expect(result![0]).toBeLessThan(300);
      expect(result![1]).toBeGreaterThan(300);
    });

    it('should not return negative minimum', () => {
      const data = [
        { distance: 0, time: 0, value: 5, formattedValue: '0:05' },
        { distance: 1, time: 60, value: 10, formattedValue: '0:10' },
      ];

      const result = calculatePaceDomain(data);

      expect(result).toBeDefined();
      expect(result![0]).toBeGreaterThanOrEqual(0);
    });

    it('should ignore isolated very slow outlier for domain scaling', () => {
      const data = [
        { distance: 0, time: 0, value: 300, formattedValue: '5:00' },
        { distance: 1, time: 60, value: 320, formattedValue: '5:20' },
        { distance: 2, time: 120, value: 330, formattedValue: '5:30' },
        { distance: 3, time: 180, value: 340, formattedValue: '5:40' },
        { distance: 4, time: 240, value: 360, formattedValue: '6:00' },
        { distance: 5, time: 300, value: 2200, formattedValue: '36:40' },
      ];

      const result = calculatePaceDomain(data);

      expect(result).toBeDefined();
      // domain upper bound should remain in a coherent range
      expect(result![1]).toBeLessThan(700);
    });

    it('should trim start/end edges when computing pace domain', () => {
      const data = [
        { distance: 0.0, time: 0, value: 800, formattedValue: '13:20' }, // start artifact
        { distance: 0.2, time: 10, value: 360, formattedValue: '6:00' },
        { distance: 0.5, time: 20, value: 350, formattedValue: '5:50' },
        { distance: 1.0, time: 30, value: 340, formattedValue: '5:40' },
        { distance: 2.0, time: 40, value: 330, formattedValue: '5:30' },
        { distance: 3.0, time: 50, value: 335, formattedValue: '5:35' },
        { distance: 3.9, time: 60, value: 820, formattedValue: '13:40' }, // end artifact
      ];

      const result = calculatePaceDomain(data);

      expect(result).toBeDefined();
      expect(result![1]).toBeLessThan(700);
    });
  });
});
