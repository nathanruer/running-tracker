import { describe, it, expect } from 'vitest';
import { calculateWeeklyStats } from '../weekly-calculator';
import type { TrainingSession } from '@/lib/types';

describe('weekly-calculator', () => {
  describe('calculateWeeklyStats', () => {
    it('should return empty stats when no sessions', () => {
      const result = calculateWeeklyStats([], []);

      expect(result.totalKm).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.averageKmPerWeek).toBe(0);
      expect(result.chartData).toEqual([]);
    });

    it('should calculate stats for completed sessions only', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
        { week: 1, distance: 5, status: 'completed' },
        { week: 2, distance: 15, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.totalKm).toBe(30);
      expect(result.totalSessions).toBe(3);
      expect(result.averageKmPerWeek).toBe(15); // 30km / 2 weeks
      expect(result.chartData).toHaveLength(2);
    });

    it('should aggregate completed sessions by week', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
        { week: 1, distance: 5, status: 'completed' },
        { week: 2, distance: 8, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.chartData[0]).toMatchObject({
        week: 1,
        km: 15,
        completedCount: 2,
      });
      expect(result.chartData[1]).toMatchObject({
        week: 2,
        km: 8,
        completedCount: 1,
      });
    });

    it('should aggregate planned sessions separately', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
      ];
      const plannedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 5, status: 'planned' },
        { week: 2, distance: 12, status: 'planned' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        plannedSessions as TrainingSession[]
      );

      expect(result.chartData[0]).toMatchObject({
        week: 1,
        km: 10,
        plannedKm: 5,
        totalWithPlanned: 15,
        completedCount: 1,
        plannedCount: 1,
      });
      expect(result.chartData[1]).toMatchObject({
        week: 2,
        km: null, // No completed in week 2
        plannedKm: 12,
        totalWithPlanned: 12,
        completedCount: 0,
        plannedCount: 1,
      });
    });

    it('should round distances to 1 decimal place', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10.555, status: 'completed' },
        { week: 1, distance: 5.444, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.chartData[0].km).toBe(16.0); // 10.555 + 5.444 = 15.999 → 16.0
    });

    it('should skip sessions with null week', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: null, distance: 10, status: 'completed' },
        { week: 1, distance: 5, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.totalKm).toBe(5); // Only week 1
      expect(result.chartData).toHaveLength(1);
    });

    it('should sort weeks in ascending order', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 3, distance: 10, status: 'completed' },
        { week: 1, distance: 5, status: 'completed' },
        { week: 2, distance: 8, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.chartData[0].week).toBe(1);
      expect(result.chartData[1].week).toBe(2);
      expect(result.chartData[2].week).toBe(3);
    });

    it('should calculate changePercent correctly', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
        { week: 2, distance: 15, status: 'completed' }, // +50%
        { week: 3, distance: 12, status: 'completed' }, // -20%
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.chartData[0].changePercent).toBeNull(); // First week
      expect(result.chartData[1].changePercent).toBe(50.0); // (15-10)/10 * 100
      expect(result.chartData[2].changePercent).toBe(-20.0); // (12-15)/15 * 100
    });

    it('should skip weeks without completed km when calculating changePercent', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
        // Week 2 has no completed sessions
        { week: 3, distance: 15, status: 'completed' },
      ];
      const plannedSessions: Partial<TrainingSession>[] = [
        { week: 2, distance: 5, status: 'planned' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        plannedSessions as TrainingSession[]
      );

      // Week 2 should have null km
      expect(result.chartData[1].km).toBeNull();
      // Week 3 changePercent should compare to week 1 (skipping week 2)
      expect(result.chartData[2].changePercent).toBe(50.0); // (15-10)/10 * 100
    });

    it('should calculate changePercentWithPlanned including planned sessions', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
        { week: 2, distance: 8, status: 'completed' },
      ];
      const plannedSessions: Partial<TrainingSession>[] = [
        { week: 2, distance: 7, status: 'planned' }, // Total: 15km
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        plannedSessions as TrainingSession[]
      );

      expect(result.chartData[0].changePercentWithPlanned).toBeNull(); // First week
      // Week 2: (15 - 10) / 10 * 100 = 50%
      expect(result.chartData[1].changePercentWithPlanned).toBe(50.0);
    });

    it('should format week labels as "S{number}"', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
        { week: 42, distance: 5, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.chartData[0].semaine).toBe('S1');
      expect(result.chartData[1].semaine).toBe('S42');
    });

    it('should handle zero distance gracefully', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 0, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.totalKm).toBe(0);
      expect(result.chartData[0].km).toBeNull(); // 0 → null
    });

    it('should handle undefined distance as 0', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: undefined, status: 'completed' },
        { week: 1, distance: 5, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        []
      );

      expect(result.totalKm).toBe(5);
      expect(result.chartData[0].km).toBe(5);
    });

    it('should include all weeks from both completed and planned sessions', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
        { week: 3, distance: 8, status: 'completed' },
      ];
      const plannedSessions: Partial<TrainingSession>[] = [
        { week: 2, distance: 5, status: 'planned' },
        { week: 4, distance: 12, status: 'planned' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        plannedSessions as TrainingSession[]
      );

      expect(result.chartData).toHaveLength(4);
      expect(result.chartData.map((d) => d.week)).toEqual([1, 2, 3, 4]);
    });

    it('should handle null planned sessions array', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { week: 1, distance: 10, status: 'completed' },
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        null as unknown as TrainingSession[]
      );

      expect(result.chartData[0]).toMatchObject({
        week: 1,
        km: 10,
        plannedKm: 0,
        plannedCount: 0,
      });
    });
  });
});
