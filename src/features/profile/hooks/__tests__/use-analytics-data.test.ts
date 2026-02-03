import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalyticsData } from '../use-analytics-data';
import type { TrainingSession } from '@/lib/types';

const calculateWeeklyStatsMock = vi.fn();

vi.mock('@/lib/domain/analytics/weekly-calculator', () => ({
  calculateWeeklyStats: (completed: TrainingSession[], planned: TrainingSession[]) =>
    calculateWeeklyStatsMock(completed, planned),
}));

beforeAll(() => {
  calculateWeeklyStatsMock.mockReturnValue({
    totalSessions: 0,
    totalDistance: 0,
    totalDuration: 0,
    weeklyData: [],
  });
});

const createSession = (overrides: Partial<TrainingSession> = {}): TrainingSession => ({
  id: Math.random().toString(),
  userId: 'user-1',
  sessionNumber: 1,
  week: null,
  date: new Date().toISOString().split('T')[0],
  sessionType: 'EF',
  duration: '01:00:00',
  distance: 10,
  avgPace: '6:00',
  avgHeartRate: 140,
  perceivedExertion: 5,
  comments: '',
  plannedDate: null,
  externalId: null,
  source: null,
  stravaData: null,
  stravaStreams: null,
  elevationGain: null,
  averageCadence: null,
  averageTemp: null,
  calories: null,
  weather: null,
  targetPace: null,
  targetDuration: null,
  targetDistance: null,
  targetRPE: null,
  targetHeartRateBpm: null,
  intervalDetails: null,
  recommendationId: null,
  status: 'completed',
  ...overrides,
});

describe('useAnalyticsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('session filtering', () => {
    it('should filter completed sessions with dates', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'completed', date: '2024-01-15' }),
        createSession({ id: '2', status: 'planned', date: '2024-01-16' }),
        createSession({ id: '3', status: 'completed', date: null }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions));

      expect(result.current.stats).toBeDefined();
    });

    it('should filter planned sessions with dates', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'planned', date: '2024-01-15' }),
        createSession({ id: '2', status: 'planned', date: null }),
        createSession({ id: '3', status: 'completed', date: '2024-01-15' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions));

      expect(result.current.stats).toBeDefined();
    });
  });

  describe('date range handling', () => {
    it('should default to "all" date range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'completed', date: '2024-01-15' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions));

      expect(result.current.dateRange).toBe('all');
    });

    it('should allow changing date range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'completed', date: '2024-01-15' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions));

      act(() => {
        result.current.setDateRange('2weeks');
      });

      expect(result.current.dateRange).toBe('2weeks');
    });

    it('should handle custom date range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'completed', date: '2024-01-15' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions));

      act(() => {
        result.current.setDateRange('custom');
        result.current.setCustomStartDate('2024-01-01');
        result.current.setCustomEndDate('2024-01-31');
      });

      expect(result.current.dateRange).toBe('custom');
      expect(result.current.customStartDate).toBe('2024-01-01');
      expect(result.current.customEndDate).toBe('2024-01-31');
    });

    it('filters planned sessions for 2 weeks range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: 'p1', status: 'planned', date: '2024-01-25' }),
        createSession({ id: 'p2', status: 'planned', date: '2024-01-10' }),
        createSession({ id: 'c1', status: 'completed', date: '2024-01-20' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions));

      act(() => {
        result.current.setDateRange('2weeks');
      });

      const lastCall = calculateWeeklyStatsMock.mock.lastCall;
      expect(lastCall?.[1]).toHaveLength(1);
    });

    it('filters planned sessions for custom range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: 'p1', status: 'planned', date: '2024-01-05' }),
        createSession({ id: 'p2', status: 'planned', date: '2024-01-20' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions));

      act(() => {
        result.current.setDateRange('custom');
        result.current.setCustomStartDate('2024-01-15');
        result.current.setCustomEndDate('2024-01-31');
      });

      const lastCall = calculateWeeklyStatsMock.mock.lastCall;
      expect(lastCall?.[1]).toHaveLength(1);
    });
  });

  describe('empty data handling', () => {
    it('should handle empty sessions array', () => {
      const { result } = renderHook(() => useAnalyticsData([]));

      expect(result.current.stats).toBeDefined();
      expect(result.current.dateRange).toBe('all');
    });

    it('should handle sessions with only planned status', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'planned', week: 1, date: '2024-01-15' }),
        createSession({ id: '2', status: 'planned', week: 2, date: '2024-01-22' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions));

      expect(result.current.stats).toBeDefined();
    });
  });
});
