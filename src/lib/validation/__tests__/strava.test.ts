import { describe, it, expect } from 'vitest';
import { validateStravaData, stravaActivitySchema, validateStravaStreams } from '../strava';

describe('validateStravaData', () => {
  const validStravaActivity = {
    id: 12345,
    name: 'Morning Run',
    distance: 10000,
    moving_time: 3600,
    elapsed_time: 3600,
    total_elevation_gain: 150,
    type: 'Run',
    start_date: '2024-01-01T10:00:00Z',
    start_date_local: '2024-01-01T10:00:00',
    average_speed: 2.78,
    max_speed: 3.5,
  };

  describe('Valid data', () => {
    it('should validate correct Strava activity data', () => {
      const result = validateStravaData(validStravaActivity);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(12345);
      expect(result?.name).toBe('Morning Run');
      expect(result?.distance).toBe(10000);
    });

    it('should validate with optional fields', () => {
      const activityWithOptionals = {
        ...validStravaActivity,
        average_heartrate: 150,
        max_heartrate: 180,
        average_cadence: 180,
        average_temp: 20,
        elev_high: 300,
        elev_low: 150,
        calories: 800,
        map: {
          id: 'map1',
          summary_polyline: 'encoded_polyline_string',
        },
        external_id: 'garmin_12345',
        upload_id: 67890,
      };

      const result = validateStravaData(activityWithOptionals);

      expect(result).not.toBeNull();
      expect(result?.average_heartrate).toBe(150);
      expect(result?.average_cadence).toBe(180);
      expect(result?.calories).toBe(800);
      expect(result?.map?.summary_polyline).toBe('encoded_polyline_string');
    });

    it('should validate with missing optional fields', () => {
      const result = validateStravaData(validStravaActivity);

      expect(result).not.toBeNull();
      expect(result?.average_heartrate).toBeUndefined();
      expect(result?.calories).toBeUndefined();
      expect(result?.map).toBeUndefined();
    });
  });

  describe('Invalid data', () => {
    it('should return null for null input', () => {
      const result = validateStravaData(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = validateStravaData(undefined);
      expect(result).toBeNull();
    });

    it('should return null for non-object input', () => {
      expect(validateStravaData('string')).toBeNull();
      expect(validateStravaData(123)).toBeNull();
      expect(validateStravaData(true)).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const invalidActivity = {
        id: 12345,
        name: 'Test',
        // missing: distance, moving_time, elapsed_time, etc.
      };

      const result = validateStravaData(invalidActivity);
      expect(result).toBeNull();
    });

    it('should return null for wrong field types', () => {
      const invalidActivity = {
        ...validStravaActivity,
        id: 'not-a-number', // should be number
      };

      const result = validateStravaData(invalidActivity);
      expect(result).toBeNull();
    });

    it('should return null for invalid map structure', () => {
      const invalidActivity = {
        ...validStravaActivity,
        map: {
          id: 'map1',
          // missing summary_polyline
        },
      };

      const result = validateStravaData(invalidActivity);
      expect(result).toBeNull();
    });
  });

  describe('stravaActivitySchema', () => {
    it('should parse valid data successfully', () => {
      const result = stravaActivitySchema.safeParse(validStravaActivity);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(12345);
        expect(result.data.name).toBe('Morning Run');
      }
    });

    it('should fail to parse invalid data', () => {
      const invalidData = {
        id: 'not-a-number',
        name: 'Test',
      };

      const result = stravaActivitySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should preserve all required fields', () => {
      const result = stravaActivitySchema.safeParse(validStravaActivity);

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.id).toBeDefined();
        expect(data.name).toBeDefined();
        expect(data.distance).toBeDefined();
        expect(data.moving_time).toBeDefined();
        expect(data.elapsed_time).toBeDefined();
        expect(data.total_elevation_gain).toBeDefined();
        expect(data.type).toBeDefined();
        expect(data.start_date).toBeDefined();
        expect(data.start_date_local).toBeDefined();
        expect(data.average_speed).toBeDefined();
        expect(data.max_speed).toBeDefined();
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty object', () => {
      const result = validateStravaData({});
      expect(result).toBeNull();
    });

    it('should handle array input', () => {
      const result = validateStravaData([validStravaActivity]);
      expect(result).toBeNull();
    });

    it('should handle extra unknown fields (should be stripped)', () => {
      const activityWithExtra = {
        ...validStravaActivity,
        unknown_field: 'should be ignored',
        another_field: 123,
      };

      const result = validateStravaData(activityWithExtra);

      expect(result).not.toBeNull();
      // Zod should strip unknown fields
      expect('unknown_field' in (result as Record<string, unknown>)).toBe(false);
      expect('another_field' in (result as Record<string, unknown>)).toBe(false);
    });
  });
});

describe('validateStravaStreams', () => {
  const validStream = {
    data: [0, 100, 200, 300],
    series_type: 'distance',
    original_size: 4,
    resolution: 'high',
  };

  describe('Valid streams', () => {
    it('should validate correct stream data', () => {
      const streams = {
        velocity_smooth: validStream,
        distance: validStream,
      };

      const result = validateStravaStreams(streams);

      expect(result).not.toBeNull();
    });

    it('should validate single stream', () => {
      const streams = {
        time: {
          data: [0, 1, 2, 3],
          series_type: 'time',
          original_size: 4,
          resolution: 'medium',
        },
      };

      const result = validateStravaStreams(streams);

      expect(result).not.toBeNull();
    });

    it('should validate empty streams object', () => {
      const result = validateStravaStreams({});

      expect(result).not.toBeNull();
      expect(result).toEqual({});
    });
  });

  describe('Invalid streams', () => {
    it('should return null for null input', () => {
      const result = validateStravaStreams(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = validateStravaStreams(undefined);
      expect(result).toBeNull();
    });

    it('should return null for non-object input', () => {
      expect(validateStravaStreams('string')).toBeNull();
      expect(validateStravaStreams(123)).toBeNull();
      expect(validateStravaStreams(true)).toBeNull();
    });

    it('should return null for stream missing data array', () => {
      const invalidStreams = {
        velocity_smooth: {
          series_type: 'distance',
          original_size: 4,
          resolution: 'high',
        },
      };

      const result = validateStravaStreams(invalidStreams);
      expect(result).toBeNull();
    });

    it('should return null for stream with empty data array', () => {
      const invalidStreams = {
        velocity_smooth: {
          data: [],
          series_type: 'distance',
          original_size: 0,
          resolution: 'high',
        },
      };

      const result = validateStravaStreams(invalidStreams);
      expect(result).toBeNull();
    });

    it('should return null for stream with invalid series_type', () => {
      const invalidStreams = {
        velocity_smooth: {
          data: [1, 2, 3],
          series_type: 'invalid',
          original_size: 3,
          resolution: 'high',
        },
      };

      const result = validateStravaStreams(invalidStreams);
      expect(result).toBeNull();
    });

    it('should return null for stream with invalid resolution', () => {
      const invalidStreams = {
        velocity_smooth: {
          data: [1, 2, 3],
          series_type: 'distance',
          original_size: 3,
          resolution: 'invalid',
        },
      };

      const result = validateStravaStreams(invalidStreams);
      expect(result).toBeNull();
    });

    it('should return null for stream with negative original_size', () => {
      const invalidStreams = {
        velocity_smooth: {
          data: [1, 2, 3],
          series_type: 'distance',
          original_size: -1,
          resolution: 'high',
        },
      };

      const result = validateStravaStreams(invalidStreams);
      expect(result).toBeNull();
    });
  });
});
