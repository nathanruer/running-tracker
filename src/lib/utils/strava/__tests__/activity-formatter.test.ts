import { describe, it, expect } from 'vitest';
import { formatStravaActivity } from '../activity-formatter';
import type { StravaActivity } from '@/lib/types';

describe('strava formatters', () => {
  describe('formatStravaActivity', () => {
    const baseActivity: StravaActivity = {
      id: 123456,
      name: 'Morning Run',
      distance: 10000, // 10km in meters
      moving_time: 3600, // 1 hour in seconds
      elapsed_time: 3700,
      total_elevation_gain: 100,
      type: 'Run',
      start_date: '2024-01-15T08:00:00Z',
      start_date_local: '2024-01-15T09:00:00',
      average_speed: 2.78,
      max_speed: 3.5,
      average_heartrate: 145,
      max_heartrate: 165,
    };

    it('should format duration from seconds to HH:MM:SS', () => {
      const activity = { ...baseActivity, moving_time: 3661 }; // 1h 1m 1s
      const result = formatStravaActivity(activity);

      expect(result.duration).toBe('01:01:01');
    });

    it('should format duration with leading zeros', () => {
      const activity = { ...baseActivity, moving_time: 305 }; // 5m 5s
      const result = formatStravaActivity(activity);

      expect(result.duration).toBe('00:05:05');
    });

    it('should handle long durations (multiple hours)', () => {
      const activity = { ...baseActivity, moving_time: 7385 }; // 2h 3m 5s
      const result = formatStravaActivity(activity);

      expect(result.duration).toBe('02:03:05');
    });

    it('should convert distance from meters to kilometers', () => {
      const activity = { ...baseActivity, distance: 15500 }; // 15.5km
      const result = formatStravaActivity(activity);

      expect(result.distance).toBe(15.5);
    });

    it('should round distance to 2 decimal places', () => {
      const activity = { ...baseActivity, distance: 10555 }; // 10.555km
      const result = formatStravaActivity(activity);

      expect(result.distance).toBe(10.56);
    });

    it('should calculate average pace correctly', () => {
      // 10km in 3600s = 360s/km = 6:00 min/km
      const activity = { ...baseActivity, distance: 10000, moving_time: 3600 };
      const result = formatStravaActivity(activity);

      expect(result.avgPace).toBe('06:00');
    });

    it('should calculate pace with proper padding', () => {
      // 5km in 1200s = 240s/km = 4:00 min/km
      const activity = { ...baseActivity, distance: 5000, moving_time: 1200 };
      const result = formatStravaActivity(activity);

      expect(result.avgPace).toBe('04:00');
    });

    it('should handle pace calculation for slow runs', () => {
      // 10km in 4200s = 420s/km = 7:00 min/km
      const activity = { ...baseActivity, distance: 10000, moving_time: 4200 };
      const result = formatStravaActivity(activity);

      expect(result.avgPace).toBe('07:00');
    });

    it('should return 00:00 pace when distance is zero', () => {
      const activity = { ...baseActivity, distance: 0, moving_time: 3600 };
      const result = formatStravaActivity(activity);

      expect(result.avgPace).toBe('00:00');
    });

    it('should format date as YYYY-MM-DD', () => {
      const activity = { ...baseActivity, start_date_local: '2024-01-15T08:30:00' };
      const result = formatStravaActivity(activity);

      expect(result.date).toBe('2024-01-15');
    });

    it('should include average heart rate when present', () => {
      const activity = { ...baseActivity, average_heartrate: 152 };
      const result = formatStravaActivity(activity);

      expect(result.avgHeartRate).toBe(152);
    });

    it('should default to 0 when average heart rate is missing', () => {
      const activity = { ...baseActivity, average_heartrate: undefined };
      const result = formatStravaActivity(activity);

      expect(result.avgHeartRate).toBe(0);
    });

    it('should map activity name to comments', () => {
      const activity = { ...baseActivity, name: 'Easy recovery run' };
      const result = formatStravaActivity(activity);

      expect(result.comments).toBe('Easy recovery run');
    });

    it('should handle empty activity name', () => {
      const activity = { ...baseActivity, name: '' };
      const result = formatStravaActivity(activity);

      expect(result.comments).toBe('');
    });

    it('should set sessionType to empty string', () => {
      const result = formatStravaActivity(baseActivity);

      expect(result.sessionType).toBe('');
    });

    it('should format complete activity correctly', () => {
      const activity: StravaActivity = {
        ...baseActivity,
        distance: 15000, // 15km
        moving_time: 4500, // 75 minutes
        start_date_local: '2024-02-20T07:30:00',
        average_heartrate: 158,
        name: 'Tempo run',
      };

      const result = formatStravaActivity(activity);

      expect(result).toEqual({
        date: '2024-02-20',
        sessionType: '',
        duration: '01:15:00',
        distance: 15,
        avgPace: '05:00', // 4500s / 15km = 300s/km = 5:00
        avgHeartRate: 158,
        comments: 'Tempo run',
        externalId: '123456',
        source: 'strava',
        stravaData: activity,
        elevationGain: 100,
        averageCadence: undefined,
        averageTemp: undefined,
        calories: undefined,
      });
    });

    it('should map detailed strava fields correctly', () => {
      const detailedActivity: StravaActivity = {
        ...baseActivity,
        total_elevation_gain: 150,
        average_cadence: 175,
        average_temp: 20,
        calories: 800,
      };

      const result = formatStravaActivity(detailedActivity);

      expect(result.elevationGain).toBe(150);
      expect(result.averageCadence).toBe(175);
      expect(result.averageTemp).toBe(20);
      expect(result.calories).toBe(800);
      expect(result.externalId).toBe('123456');
      expect(result.source).toBe('strava');
      expect(result.stravaData).toEqual(detailedActivity);
    });
  });
});
