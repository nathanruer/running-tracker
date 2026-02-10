import { describe, it, expect } from 'vitest';
import { calculateWeeklyStats, getISOWeekKey, formatWeekLabel, parseWeekKey } from '../weekly-calculator';
import type { TrainingSession } from '@/lib/types';

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

  describe('parseWeekKey', () => {
    it('should parse week key back to Monday', () => {
      const monday = parseWeekKey('2026-W02');
      expect(monday.getFullYear()).toBe(2026);
      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(5);
    });
  });

  describe('formatWeekLabel', () => {
    it('should format week within same month', () => {
      const start = new Date('2026-01-05');
      const end = new Date('2026-01-11');
      expect(formatWeekLabel(start, end, false)).toBe('5-11 jan');
    });

    it('should format week spanning two months', () => {
      const start = new Date('2026-01-26');
      const end = new Date('2026-02-01');
      expect(formatWeekLabel(start, end, false)).toBe('26 jan - 1 fév');
    });
  });

  describe('calculateWeeklyStats', () => {
    it('should return empty stats when no sessions', () => {
      const result = calculateWeeklyStats([], []);
      expect(result.totalKm).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.averageKmPerWeek).toBe(0);
      expect(result.chartData).toEqual([]);
    });

    it('should include planned sessions even when no completed sessions exist', () => {
      const plannedSessions: Partial<TrainingSession>[] = [
        { plannedDate: '2026-01-06', targetDistance: 8, status: 'planned', date: null },
        { plannedDate: '2026-01-08', targetDistance: 5, status: 'planned', date: null },
      ];

      const result = calculateWeeklyStats([], plannedSessions as TrainingSession[]);

      expect(result.totalKm).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.chartData).toHaveLength(1);
      expect(result.chartData[0].km).toBe(0);
      expect(result.chartData[0].plannedKm).toBe(13);
      expect(result.chartData[0].plannedCount).toBe(2);
    });

    it('should calculate stats based on session dates', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
        createSession('2026-01-07', 5),
        createSession('2026-01-13', 15),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.totalKm).toBe(30);
      expect(result.totalSessions).toBe(3);
      expect(result.activeWeeksCount).toBe(2);
      expect(result.chartData).toHaveLength(2);
    });

    it('should include inactive weeks with km=0 between active weeks', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
        createSession('2026-02-03', 15),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.totalKm).toBe(25);
      expect(result.totalSessions).toBe(2);
      expect(result.activeWeeksCount).toBe(2);
      expect(result.totalWeeksSpan).toBe(5);
      expect(result.chartData).toHaveLength(5);
      
      expect(result.chartData[0].isActive).toBe(true);
      expect(result.chartData[0].km).toBe(10);
      expect(result.chartData[0].trainingWeek).toBe(1);
      expect(result.chartData[0].gapWeeks).toBe(0);
      
      expect(result.chartData[1].isActive).toBe(false);
      expect(result.chartData[1].km).toBe(0);
      expect(result.chartData[1].trainingWeek).toBeNull();
      
      expect(result.chartData[2].isActive).toBe(false);
      expect(result.chartData[2].km).toBe(0);
      
      expect(result.chartData[3].isActive).toBe(false);
      expect(result.chartData[3].km).toBe(0);
      
      expect(result.chartData[4].isActive).toBe(true);
      expect(result.chartData[4].km).toBe(15);
      expect(result.chartData[4].trainingWeek).toBe(2);
      expect(result.chartData[4].gapWeeks).toBe(3);
    });

    it('should aggregate sessions within the same week', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-05', 10),
        createSession('2026-01-07', 5),
        createSession('2026-01-11', 3),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.chartData).toHaveLength(1);
      expect(result.chartData[0].km).toBe(18);
      expect(result.chartData[0].completedCount).toBe(3);
    });

    it('should handle planned sessions', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
      ];
      const plannedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-08', 5, 'planned'),
        createSession('2026-01-15', 12, 'planned'),
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        plannedSessions as TrainingSession[]
      );

      expect(result.chartData).toHaveLength(2);
      
      expect(result.chartData[0].km).toBe(10);
      expect(result.chartData[0].plannedKm).toBe(5);
      expect(result.chartData[0].totalWithPlanned).toBe(15);
      expect(result.chartData[0].completedCount).toBe(1);
      expect(result.chartData[0].plannedCount).toBe(1);
      
      expect(result.chartData[1].km).toBe(0);
      expect(result.chartData[1].plannedKm).toBe(12);
      expect(result.chartData[1].totalWithPlanned).toBe(12);
    });

    it('should format week labels correctly', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
        createSession('2026-01-13', 15),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.chartData[0].label).toBe('5-11 jan');
      expect(result.chartData[0].weekKey).toBe('2026-W02');
      expect(result.chartData[1].label).toBe('12-18 jan');
      expect(result.chartData[1].weekKey).toBe('2026-W03');
    });

    it('should calculate changePercent between active weeks only', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
        createSession('2026-01-20', 15),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.chartData[0].changePercent).toBeNull();
      expect(result.chartData[1].isActive).toBe(false);
      expect(result.chartData[1].changePercent).toBeNull();
      expect(result.chartData[2].changePercent).toBe(50.0);
    });

    it('should skip sessions without date', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        { date: null, plannedDate: null, targetDistance: 10, status: 'planned' },
        createSession('2026-01-06', 5),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.totalKm).toBe(5);
      expect(result.chartData).toHaveLength(1);
    });

    it('should calculate averages correctly', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
        createSession('2026-01-27', 20),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.totalWeeksSpan).toBe(4);
      expect(result.averageKmPerWeek).toBe(30 / 4);
      expect(result.activeWeeksCount).toBe(2);
      expect(result.averageKmPerActiveWeek).toBe(30 / 2);
    });

    it('should round distances to 1 decimal place', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10.555),
        createSession('2026-01-07', 5.444),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.chartData[0].km).toBe(16.0);
    });

    it('should handle sessions spanning year boundary', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2025-12-29', 10),
        createSession('2026-01-02', 15),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.chartData).toHaveLength(1);
      expect(result.chartData[0].km).toBe(25);
      expect(result.chartData[0].weekKey).toBe('2026-W01');
    });

    it('should handle null planned sessions array', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 10),
      ];

      const result = calculateWeeklyStats(
        completedSessions as TrainingSession[],
        null as unknown as TrainingSession[]
      );

      expect(result.chartData[0].km).toBe(10);
      expect(result.chartData[0].plannedKm).toBe(0);
      expect(result.chartData[0].plannedCount).toBe(0);
    });

    it('should aggregate duration, heart rate and calculate average pace', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-05', 10, 'completed', '01:00:00', 150),
        createSession('2026-01-07', 5, 'completed', '00:30:00', 140),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.chartData[0].km).toBe(15.0);
      expect(result.chartData[0].durationSeconds).toBe(5400); // 1h30
      expect(result.chartData[0].avgHeartRate).toBe(145);
      expect(result.chartData[0].avgPaceSeconds).toBe(360); // 5400 / 15 = 360s/km = 6:00 min/km
    });

    it('should handle zero distance gracefully', () => {
      const completedSessions: Partial<TrainingSession>[] = [
        createSession('2026-01-06', 0),
      ];

      const result = calculateWeeklyStats(completedSessions as TrainingSession[], []);

      expect(result.totalKm).toBe(0);
      expect(result.chartData[0].km).toBe(0);
      expect(result.chartData[0].isActive).toBe(false);
    });
  });
});
