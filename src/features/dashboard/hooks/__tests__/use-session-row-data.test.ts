import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSessionRowData } from '../use-session-row-data';
import type { TrainingSession } from '@/lib/types';

const createCompletedSession = (overrides: Partial<TrainingSession> = {}): TrainingSession => ({
  id: '1',
  sessionNumber: 1,
  week: 1,
  date: '2024-01-15',
  sessionType: 'Footing',
  duration: '00:45:00',
  distance: 8.5,
  avgPace: '05:18',
  avgHeartRate: 145,
  perceivedExertion: 5,
  comments: 'Good run',
  userId: 'user1',
  status: 'completed',
  ...overrides,
});

const createPlannedSession = (overrides: Partial<TrainingSession> = {}): TrainingSession => ({
  id: '2',
  sessionNumber: 2,
  week: 1,
  date: null,
  plannedDate: '2024-01-16T00:00:00.000Z',
  sessionType: 'Footing',
  duration: null,
  distance: null,
  avgPace: null,
  avgHeartRate: null,
  perceivedExertion: null,
  comments: 'Planned run',
  userId: 'user1',
  status: 'planned',
  targetDuration: 45,
  targetDistance: 8,
  targetPace: '05:30',
  targetHeartRateBpm: 140,
  targetRPE: 5,
  ...overrides,
});

describe('useSessionRowData', () => {
  describe('completed sessions', () => {
    it('should return isPlanned as false for completed sessions', () => {
      const session = createCompletedSession();
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.isPlanned).toBe(false);
    });

    it('should format duration correctly', () => {
      const session = createCompletedSession({ duration: '01:30:15' });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.duration).toContain('30');
    });

    it('should format distance correctly', () => {
      const session = createCompletedSession({ distance: 10.5 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.distance).toBe('10.50');
    });

    it('should use avgPace directly', () => {
      const session = createCompletedSession({ avgPace: '05:30' });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.pace).toBe('05:30');
    });

    it('should use avgHeartRate directly', () => {
      const session = createCompletedSession({ avgHeartRate: 155 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.heartRate).toBe('155');
    });

    it('should set appropriate RPE color for low effort', () => {
      const session = createCompletedSession({ perceivedExertion: 3 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.rpeColor).toContain('emerald');
    });

    it('should set appropriate RPE color for moderate effort', () => {
      const session = createCompletedSession({ perceivedExertion: 5 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.rpeColor).toContain('amber');
    });

    it('should set appropriate RPE color for high effort', () => {
      const session = createCompletedSession({ perceivedExertion: 8 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.rpeColor).toContain('orange');
    });

    it('should set appropriate RPE color for max effort', () => {
      const session = createCompletedSession({ perceivedExertion: 10 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.rpeColor).toContain('rose');
    });

    it('should format date correctly', () => {
      const session = createCompletedSession({ date: '2024-01-15' });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.dateDisplay).toBe('15.01.2024');
    });
  });

  describe('planned sessions', () => {
    it('should return isPlanned as true for planned sessions', () => {
      const session = createPlannedSession();
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.isPlanned).toBe(true);
    });

    it('should use targetDuration for planned sessions', () => {
      const session = createPlannedSession({ targetDuration: 60 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.duration).not.toBe('-');
    });

    it('should use targetDistance for planned sessions', () => {
      const session = createPlannedSession({ targetDistance: 10 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.distance).toBe('10.00');
    });

    it('should set hasApprox flag for planned sessions', () => {
      const session = createPlannedSession({ targetPace: '05:30' });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.hasApprox).toBe(true);
    });

    it('should use targetRPE for planned sessions', () => {
      const session = createPlannedSession({ targetRPE: 6 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.rpe).toBe(6);
    });

    it('should format plannedDate for planned sessions', () => {
      const session = createPlannedSession();
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.dateDisplay).toBe('16.01.2024');
    });

    it('should return null dateDisplay when no date and no plannedDate', () => {
      const session = createPlannedSession({ date: null, plannedDate: null });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.dateDisplay).toBeNull();
    });
  });

  describe('interval sessions', () => {
    it('should detect interval details for Fractionné type', () => {
      const session = createCompletedSession({
        sessionType: 'Fractionné',
        intervalDetails: {
          workoutType: 'VMA',
          repetitionCount: 8,
          effortDuration: '01:00',
          recoveryDuration: '01:00',
          effortDistance: null,
          recoveryDistance: null,
          targetEffortPace: null,
          targetEffortHR: null,
          targetRecoveryPace: null,
          steps: [],
        },
      });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.hasIntervalDetails).toBe(true);
      expect(result.current.workoutTypeLabel).toBe('VMA');
    });

    it('should return false for hasIntervalDetails for non-fractionné', () => {
      const session = createCompletedSession({ sessionType: 'Footing' });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.hasIntervalDetails).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null values gracefully', () => {
      const session = createCompletedSession({
        duration: null,
        distance: null,
        avgPace: null,
        avgHeartRate: null,
        perceivedExertion: null,
      });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.duration).toBe('-');
      expect(result.current.distance).toBe('-');
      expect(result.current.pace).toBe('-');
      expect(result.current.heartRate).toBe('-');
      expect(result.current.rpe).toBeNull();
    });

    it('should handle zero distance', () => {
      const session = createCompletedSession({ distance: 0 });
      const { result } = renderHook(() => useSessionRowData(session));
      expect(result.current.distance).toBe('-');
    });
  });
});
