import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnalyticsData, type AnalyticsFilters } from '../use-analytics-data';
import type { TrainingSession } from '@/lib/types';

const calculateBucketedStatsMock = vi.fn();

vi.mock('@/lib/domain/analytics/weekly-calculator', () => ({
  calculateBucketedStats: (params: { completedSessions: TrainingSession[]; plannedSessions: TrainingSession[] }) =>
    calculateBucketedStatsMock(params),
}));

beforeAll(() => {
  calculateBucketedStatsMock.mockReturnValue({
    totalKm: 0,
    totalSessions: 0,
    averageKmPerBucket: 0,
    averageKmPerActiveBucket: 0,
    activeBucketsCount: 0,
    totalBuckets: 0,
    chartData: [],
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
} as TrainingSession);

const defaultFilters: AnalyticsFilters = {
  dateRange: 'all',
  granularity: 'week',
  customStartDate: '',
  customEndDate: '',
};

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
        createSession({ id: '3', status: 'planned', date: null, plannedDate: null }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions, defaultFilters));

      expect(result.current.stats).toBeDefined();
    });

    it('should filter planned sessions with dates', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'planned', date: null, plannedDate: '2024-01-15' }),
        createSession({ id: '2', status: 'planned', date: null, plannedDate: null }),
        createSession({ id: '3', status: 'completed', date: '2024-01-15' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions, defaultFilters));

      expect(result.current.stats).toBeDefined();
    });
  });

  describe('date range handling', () => {
    it('should compute stats with given date range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'completed', date: '2024-01-15' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions, defaultFilters));

      expect(result.current.stats).toBeDefined();
      expect(result.current.rangeLabel).toBeDefined();
    });

    it('should handle custom date range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'completed', date: '2024-01-15' }),
      ];

      const filters: AnalyticsFilters = {
        dateRange: 'custom',
        granularity: 'week',
        customStartDate: '2024-01-01',
        customEndDate: '2024-01-31',
      };

      const { result } = renderHook(() => useAnalyticsData(sessions, filters));

      expect(result.current.stats).toBeDefined();
      expect(result.current.customDateError).toBe('');
    });

    it('does not include open bucket planned for preset ranges', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: 'p1', status: 'planned', date: '2024-01-25' }),
        createSession({ id: 'c1', status: 'completed', date: '2024-01-20' }),
      ];

      renderHook(() => useAnalyticsData(sessions, { ...defaultFilters, dateRange: '4weeks' }));

      const lastCall = calculateBucketedStatsMock.mock.lastCall;
      expect(lastCall?.[0].includePlannedInOpenBucket).toBe(false);
    });

    it('includes open bucket planned for open-ended custom range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: 'p1', status: 'planned', date: '2024-01-05' }),
        createSession({ id: 'p2', status: 'planned', date: '2024-01-20' }),
      ];

      const filters: AnalyticsFilters = {
        dateRange: 'custom',
        granularity: 'week',
        customStartDate: '2024-01-15',
        customEndDate: '',
      };

      renderHook(() => useAnalyticsData(sessions, filters));

      const lastCall = calculateBucketedStatsMock.mock.lastCall;
      expect(lastCall?.[0].includePlannedInOpenBucket).toBe(true);
    });

    it('includes open bucket planned for "all" range', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: 'c1', status: 'completed', date: '2024-01-15' }),
      ];

      renderHook(() => useAnalyticsData(sessions, defaultFilters));

      const lastCall = calculateBucketedStatsMock.mock.lastCall;
      expect(lastCall?.[0].includePlannedInOpenBucket).toBe(true);
    });
  });

  describe('empty data handling', () => {
    it('should handle empty sessions array', () => {
      const { result } = renderHook(() => useAnalyticsData([], defaultFilters));

      expect(result.current.stats).toBeDefined();
    });

    it('should handle sessions with only planned status', () => {
      const sessions: TrainingSession[] = [
        createSession({ id: '1', status: 'planned', week: 1, date: '2024-01-15' }),
        createSession({ id: '2', status: 'planned', week: 2, date: '2024-01-22' }),
      ];

      const { result } = renderHook(() => useAnalyticsData(sessions, defaultFilters));

      expect(result.current.stats).toBeDefined();
    });
  });
});
