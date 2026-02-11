import { describe, it, expect } from 'vitest';
import { calculateBucketedStats } from '../weekly-calculator';
import type { TrainingSession } from '@/lib/types';
import { getISOWeekKey } from '@/lib/utils/date';

function createSession(
  dateStr: string,
  distance: number,
  status: 'completed' | 'planned' = 'completed',
  duration: string | null = null,
  avgHeartRate: number | null = null
): Partial<TrainingSession> {
  return { date: dateStr, distance, status, week: null, duration, avgHeartRate };
}

describe('weekly-calculator', () => {
  describe('getISOWeekKey', () => {
    it('should return correct ISO week key', () => {
      expect(getISOWeekKey(new Date('2026-01-06'))).toBe('2026-W02');
      expect(getISOWeekKey(new Date('2026-01-01'))).toBe('2026-W01');
      expect(getISOWeekKey(new Date('2025-12-31'))).toBe('2026-W01');
    });
  });

  describe('calculateBucketedStats', () => {
    it('should return empty stats when range is missing', () => {
      const result = calculateBucketedStats({
        completedSessions: [],
        plannedSessions: [],
        rangeStart: null,
        rangeEnd: null,
        granularity: 'week',
      });

      expect(result.totalKm).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.chartData).toEqual([]);
    });

    it('should include planned sessions even when no completed sessions exist', () => {
      const plannedSessions: Partial<TrainingSession>[] = [
        { plannedDate: '2026-01-06', targetDistance: 8, status: 'planned', date: null },
        { plannedDate: '2026-01-08', targetDistance: 5, status: 'planned', date: null },
      ];

      const result = calculateBucketedStats({
        completedSessions: [],
        plannedSessions: plannedSessions as TrainingSession[],
        rangeStart: new Date('2026-01-05T00:00:00'),
        rangeEnd: new Date('2026-01-18T23:59:59'),
        granularity: 'week',
      });

      expect(result.totalKm).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.chartData).toHaveLength(2);
      expect(result.chartData[0].plannedKm).toBe(13);
      expect(result.chartData[0].plannedCount).toBe(2);
    });

    it('should include inactive buckets within range', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
        createSession('2026-02-03', 15),
      ];

      const result = calculateBucketedStats({
        completedSessions: completedSessions as TrainingSession[],
        plannedSessions: [],
        rangeStart: new Date('2026-01-05T00:00:00'),
        rangeEnd: new Date('2026-02-08T23:59:59'),
        granularity: 'week',
      });

      expect(result.totalKm).toBe(25);
      expect(result.totalSessions).toBe(2);
      expect(result.totalBuckets).toBe(5);
      expect(result.chartData).toHaveLength(5);
      expect(result.chartData[0].km).toBe(10);
      expect(result.chartData[1].km).toBe(0);
      expect(result.chartData[4].km).toBe(15);
    });

    it('should aggregate sessions within the same bucket', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-05', 10),
        createSession('2026-01-07', 5),
        createSession('2026-01-11', 3),
      ];

      const result = calculateBucketedStats({
        completedSessions: completedSessions as TrainingSession[],
        plannedSessions: [],
        rangeStart: new Date('2026-01-05T00:00:00'),
        rangeEnd: new Date('2026-01-11T23:59:59'),
        granularity: 'week',
      });

      expect(result.chartData).toHaveLength(1);
      expect(result.chartData[0].km).toBe(18);
      expect(result.chartData[0].completedCount).toBe(3);
    });

    it('should mark partial buckets and compute coverage', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-03', 5),
        createSession('2026-01-07', 8),
      ];

      const result = calculateBucketedStats({
        completedSessions: completedSessions as TrainingSession[],
        plannedSessions: [],
        rangeStart: new Date('2026-01-02T00:00:00'),
        rangeEnd: new Date('2026-01-10T23:59:59'),
        granularity: 'week',
      });

      expect(result.chartData).toHaveLength(2);
      expect(result.chartData[0].isPartial).toBe(true);
      expect(result.chartData[0].coverageLabel).toBe('3/7 j');
      expect(result.chartData[1].isPartial).toBe(true);
      expect(result.chartData[1].coverageLabel).toBe('6/7 j');
    });

    it('should include completed sessions in open bucket beyond range end', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-02-11', 10),
      ];

      const result = calculateBucketedStats({
        completedSessions: completedSessions as TrainingSession[],
        plannedSessions: [],
        rangeStart: new Date('2026-02-09T00:00:00'),
        rangeEnd: new Date('2026-02-10T23:59:59'),
        granularity: 'week',
        includePlannedInOpenBucket: true,
      });

      expect(result.chartData).toHaveLength(1);
      expect(result.chartData[0].km).toBe(10);
    });

    it('should calculate changePercent between active buckets only', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
        createSession('2026-01-20', 15),
      ];

      const result = calculateBucketedStats({
        completedSessions: completedSessions as TrainingSession[],
        plannedSessions: [],
        rangeStart: new Date('2026-01-05T00:00:00'),
        rangeEnd: new Date('2026-01-25T23:59:59'),
        granularity: 'week',
      });

      expect(result.chartData[0].changePercent).toBeNull();
      expect(result.chartData[1].km).toBe(0);
      expect(result.chartData[2].changePercent).toBe(50.0);
    });

    it('should calculate changePercentWithPlanned using total volume', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-13', 10),
      ];
      const plannedSessions: Partial<TrainingSession>[] = [
        { plannedDate: '2026-01-06', targetDistance: 20, status: 'planned', date: null },
        { plannedDate: '2026-01-14', targetDistance: 20, status: 'planned', date: null },
      ];

      const result = calculateBucketedStats({
        completedSessions: completedSessions as TrainingSession[],
        plannedSessions: plannedSessions as TrainingSession[],
        rangeStart: new Date('2026-01-05T00:00:00'),
        rangeEnd: new Date('2026-01-19T23:59:59'),
        granularity: 'week',
      });

      expect(result.chartData).toHaveLength(3);
      expect(result.chartData[1].totalWithPlanned).toBe(30);
      expect(result.chartData[1].changePercentWithPlanned).toBe(50.0);
    });

    it('should aggregate duration, heart rate and calculate average pace', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-05', 10, 'completed', '01:00:00', 150),
        createSession('2026-01-07', 5, 'completed', '00:30:00', 140),
      ];

      const result = calculateBucketedStats({
        completedSessions: completedSessions as TrainingSession[],
        plannedSessions: [],
        rangeStart: new Date('2026-01-05T00:00:00'),
        rangeEnd: new Date('2026-01-11T23:59:59'),
        granularity: 'week',
      });

      expect(result.chartData[0].km).toBe(15.0);
      expect(result.chartData[0].durationSeconds).toBe(5400);
      expect(result.chartData[0].avgHeartRate).toBe(145);
      expect(result.chartData[0].avgPaceSeconds).toBe(360);
    });
  });
});
