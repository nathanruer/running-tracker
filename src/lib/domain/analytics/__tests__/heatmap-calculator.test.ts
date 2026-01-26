import { describe, it, expect } from 'vitest';
import { calculateHeatmapData } from '../heatmap-calculator';
import type { TrainingSession } from '@/lib/types';

function createSession(dateStr: string, distance: number): Partial<TrainingSession> {
  return {
    id: `session-${dateStr}`,
    date: dateStr,
    distance,
    status: 'completed',
  };
}

describe('heatmap-calculator', () => {
  describe('calculateHeatmapData', () => {
    it('should return empty stats for empty sessions array', () => {
      const result = calculateHeatmapData([], 2026);

      expect(result.yearStats.totalSessions).toBe(0);
      expect(result.yearStats.totalKm).toBe(0);
      expect(result.yearStats.activeDays).toBe(0);
      expect(result.maxKm).toBe(1);
    });

    it('should calculate total sessions and km correctly', () => {
      const sessions = [
        createSession('2026-01-15', 10),
        createSession('2026-01-16', 5),
        createSession('2026-02-01', 8),
      ] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2026);

      expect(result.yearStats.totalSessions).toBe(3);
      expect(result.yearStats.totalKm).toBe(23);
      expect(result.yearStats.activeDays).toBe(3);
    });

    it('should filter sessions by selected year', () => {
      const sessions = [
        createSession('2025-12-31', 10),
        createSession('2026-01-01', 5),
        createSession('2026-06-15', 8),
        createSession('2027-01-01', 12),
      ] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2026);

      expect(result.yearStats.totalSessions).toBe(2);
      expect(result.yearStats.totalKm).toBe(13);
    });

    it('should aggregate sessions on the same day', () => {
      const sessions = [
        createSession('2026-03-10', 5),
        createSession('2026-03-10', 3),
        createSession('2026-03-10', 2),
      ] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2026);

      expect(result.yearStats.totalSessions).toBe(3);
      expect(result.yearStats.activeDays).toBe(1);
      expect(result.maxKm).toBe(10);
    });

    it('should calculate maxKm correctly', () => {
      const sessions = [
        createSession('2026-01-10', 5),
        createSession('2026-01-11', 20),
        createSession('2026-01-12', 8),
      ] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2026);

      expect(result.maxKm).toBe(20);
    });

    it('should return maxKm of 1 when all sessions have 0 distance', () => {
      const sessions = [
        createSession('2026-01-10', 0),
        createSession('2026-01-11', 0),
      ] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2026);

      expect(result.maxKm).toBe(1);
    });

    it('should generate 52-53 weeks for a full year', () => {
      const result = calculateHeatmapData([], 2026);

      expect(result.weeks.length).toBeGreaterThanOrEqual(52);
      expect(result.weeks.length).toBeLessThanOrEqual(54);
    });

    it('should have 7 days per week', () => {
      const result = calculateHeatmapData([], 2026);

      result.weeks.forEach((week) => {
        expect(week.length).toBe(7);
      });
    });

    it('should generate month labels', () => {
      const result = calculateHeatmapData([], 2026);

      expect(result.monthLabels.length).toBe(12);
      expect(result.monthLabels[0].month).toBe(0);
      expect(result.monthLabels[11].month).toBe(11);
    });

    it('should use targetDistance when distance is not available', () => {
      const sessions = [
        { id: 'session-1', date: '2026-04-01', targetDistance: 15, status: 'planned' },
      ] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2026);

      expect(result.yearStats.totalKm).toBe(15);
    });

    it('should handle sessions with null date', () => {
      const sessions = [
        { id: 'session-1', date: null, distance: 10, status: 'completed' },
        createSession('2026-05-01', 5),
      ] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2026);

      expect(result.yearStats.totalSessions).toBe(1);
      expect(result.yearStats.totalKm).toBe(5);
    });

    it('should pad first week with empty days to start on Monday', () => {
      const result = calculateHeatmapData([], 2026);

      const firstValidDayIndex = result.weeks[0].findIndex((d) => d.date.getTime() > 0);
      expect(firstValidDayIndex).toBeGreaterThanOrEqual(0);
    });

    it('should pad last week with empty days to complete the week', () => {
      const result = calculateHeatmapData([], 2026);

      const lastWeek = result.weeks[result.weeks.length - 1];
      expect(lastWeek.length).toBe(7);
    });

    it('should handle leap year correctly', () => {
      const sessions = [createSession('2024-02-29', 10)] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2024);

      expect(result.yearStats.totalSessions).toBe(1);
      expect(result.yearStats.totalKm).toBe(10);
    });

    it('should return correct DayData structure', () => {
      const sessions = [createSession('2026-07-15', 12)] as TrainingSession[];

      const result = calculateHeatmapData(sessions, 2026);

      const july15 = result.weeks.flat().find(
        (d) => d.date.getTime() > 0 && d.date.getMonth() === 6 && d.date.getDate() === 15
      );

      expect(july15).toBeDefined();
      expect(july15?.totalKm).toBe(12);
      expect(july15?.count).toBe(1);
      expect(july15?.sessions.length).toBe(1);
    });
  });
});
