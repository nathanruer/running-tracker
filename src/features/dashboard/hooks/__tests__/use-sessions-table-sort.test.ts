import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSessionsTableSort } from '../use-sessions-table-sort';
import type { TrainingSession } from '@/lib/types';

const createCompletedSession = (overrides: Partial<TrainingSession>): TrainingSession => ({
  id: '1',
  sessionNumber: 1,
  week: 1,
  date: '2024-01-01',
  sessionType: 'Footing',
  duration: '00:30:00',
  distance: 5,
  avgPace: '06:00',
  avgHeartRate: 140,
  perceivedExertion: 5,
  comments: 'Test',
  userId: 'user1',
  status: 'completed',
  ...overrides,
});

const createPlannedSession = (overrides: Partial<TrainingSession>): TrainingSession => ({
  id: '1',
  sessionNumber: 1,
  week: 1,
  date: null,
  sessionType: 'Footing',
  duration: null,
  distance: null,
  avgPace: null,
  avgHeartRate: null,
  perceivedExertion: null,
  comments: 'Test',
  userId: 'user1',
  status: 'planned',
  targetDuration: 30,
  targetDistance: 5,
  targetPace: '06:00',
  targetHeartRateBpm: '140',
  targetRPE: 5,
  ...overrides,
});

describe('useSessionsTableSort', () => {
  describe('initialization', () => {
    it('should initialize with no sort', () => {
      const sessions = [createCompletedSession({ id: '1' })];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      expect(result.current.sortColumn).toBeNull();
      expect(result.current.sortDirection).toBeNull();
      expect(result.current.sortedSessions).toEqual(sessions);
    });
  });

  describe('handleSort', () => {
    it('should set sort column and direction on first click', () => {
      const sessions = [createCompletedSession({ id: '1' })];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('sessionNumber');
      });
      
      expect(result.current.sortColumn).toBe('sessionNumber');
      expect(result.current.sortDirection).toBe('desc');
    });

    it('should cycle through sort directions', () => {
      const sessions = [createCompletedSession({ id: '1' })];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      // First click - desc
      act(() => {
        result.current.handleSort('sessionNumber');
      });
      expect(result.current.sortDirection).toBe('desc');

      // Second click - asc
      act(() => {
        result.current.handleSort('sessionNumber');
      });
      expect(result.current.sortDirection).toBe('asc');

      // Third click - reset
      act(() => {
        result.current.handleSort('sessionNumber');
      });
      expect(result.current.sortDirection).toBeNull();
      expect(result.current.sortColumn).toBeNull();
    });

    it('should switch to new column when different column is clicked', () => {
      const sessions = [createCompletedSession({ id: '1' })];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('sessionNumber');
      });
      expect(result.current.sortColumn).toBe('sessionNumber');

      act(() => {
        result.current.handleSort('date');
      });
      expect(result.current.sortColumn).toBe('date');
      expect(result.current.sortDirection).toBe('desc');
    });
  });

  describe('sorting by sessionNumber', () => {
    it('should sort by sessionNumber descending', () => {
      const sessions = [
        createCompletedSession({ id: '1', sessionNumber: 1 }),
        createCompletedSession({ id: '2', sessionNumber: 3 }),
        createCompletedSession({ id: '3', sessionNumber: 2 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('sessionNumber');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.sessionNumber)).toEqual([3, 2, 1]);
    });

    it('should sort by sessionNumber ascending', () => {
      const sessions = [
        createCompletedSession({ id: '1', sessionNumber: 1 }),
        createCompletedSession({ id: '2', sessionNumber: 3 }),
        createCompletedSession({ id: '3', sessionNumber: 2 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('sessionNumber');
      });
      act(() => {
        result.current.handleSort('sessionNumber');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.sessionNumber)).toEqual([1, 2, 3]);
    });
  });

  describe('sorting by date', () => {
    it('should sort by date descending', () => {
      const sessions = [
        createCompletedSession({ id: '1', date: '2024-01-01' }),
        createCompletedSession({ id: '2', date: '2024-01-03' }),
        createCompletedSession({ id: '3', date: '2024-01-02' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('date');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.date)).toEqual(['2024-01-03', '2024-01-02', '2024-01-01']);
    });

    it('should handle null dates', () => {
      const sessions = [
        createCompletedSession({ id: '1', date: '2024-01-01' }),
        createCompletedSession({ id: '2', date: null }),
        createCompletedSession({ id: '3', date: '2024-01-02' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('date');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted[0].date).toBe('2024-01-02');
      expect(sorted[1].date).toBe('2024-01-01');
      expect(sorted[2].date).toBeNull();
    });
  });

  describe('sorting by avgHeartRate', () => {
    it('should sort completed sessions by avgHeartRate descending', () => {
      const sessions = [
        createCompletedSession({ id: '1', avgHeartRate: 140 }),
        createCompletedSession({ id: '2', avgHeartRate: 160 }),
        createCompletedSession({ id: '3', avgHeartRate: 150 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgHeartRate');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.avgHeartRate)).toEqual([160, 150, 140]);
    });

    it('should sort planned sessions by targetHeartRateBpm (string) descending', () => {
      const sessions = [
        createPlannedSession({ id: '1', targetHeartRateBpm: '140' }),
        createPlannedSession({ id: '2', targetHeartRateBpm: '160' }),
        createPlannedSession({ id: '3', targetHeartRateBpm: '150' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgHeartRate');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.targetHeartRateBpm)).toEqual(['160', '150', '140']);
    });

    it('should sort planned sessions by targetHeartRateBpm (string) descending', () => {
      const sessions = [
        createPlannedSession({ id: '1', targetHeartRateBpm: '140' }),
        createPlannedSession({ id: '2', targetHeartRateBpm: '160' }),
        createPlannedSession({ id: '3', targetHeartRateBpm: '150' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgHeartRate');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.targetHeartRateBpm)).toEqual(['160', '150', '140']);
    });

    it('should sort mixed completed and planned sessions by heart rate', () => {
      const sessions = [
        createCompletedSession({ id: '1', avgHeartRate: 140 }),
        createPlannedSession({ id: '2', targetHeartRateBpm: '160' }),
        createCompletedSession({ id: '3', avgHeartRate: 150 }),
        createPlannedSession({ id: '4', targetHeartRateBpm: '155' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgHeartRate');
      });

      const sorted = result.current.sortedSessions;
      const heartRates = sorted.map(s => 
        s.status === 'planned' 
          ? (s.targetHeartRateBpm ? (typeof s.targetHeartRateBpm === 'number' ? s.targetHeartRateBpm : parseFloat(s.targetHeartRateBpm)) : null)
          : s.avgHeartRate
      );
      expect(heartRates).toEqual([160, 155, 150, 140]);
    });

    it('should handle null heart rates', () => {
      const sessions = [
        createCompletedSession({ id: '1', avgHeartRate: 140 }),
        createCompletedSession({ id: '2', avgHeartRate: null }),
        createCompletedSession({ id: '3', avgHeartRate: 150 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgHeartRate');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted[0].avgHeartRate).toBe(150);
      expect(sorted[1].avgHeartRate).toBe(140);
      expect(sorted[2].avgHeartRate).toBeNull();
    });
  });

  describe('sorting by avgPace', () => {
    it('should sort completed sessions by avgPace descending on first click (fastest first)', () => {
      const sessions = [
        createCompletedSession({ id: '1', avgPace: '06:00' }),
        createCompletedSession({ id: '2', avgPace: '05:30' }),
        createCompletedSession({ id: '3', avgPace: '06:30' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgPace');
      });

      expect(result.current.sortDirection).toBe('desc');
      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.avgPace)).toEqual(['05:30', '06:00', '06:30']);
    });

    it('should sort planned sessions by targetPace descending on first click', () => {
      const sessions = [
        createPlannedSession({ id: '1', targetPace: '06:00' }),
        createPlannedSession({ id: '2', targetPace: '05:30' }),
        createPlannedSession({ id: '3', targetPace: '06:30' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgPace');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.targetPace)).toEqual(['05:30', '06:00', '06:30']);
    });

    it('should sort mixed completed and planned sessions by pace descending', () => {
      const sessions = [
        createCompletedSession({ id: '1', avgPace: '06:00' }),
        createPlannedSession({ id: '2', targetPace: '05:30' }),
        createCompletedSession({ id: '3', avgPace: '06:30' }),
        createPlannedSession({ id: '4', targetPace: '05:00' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgPace');
      });

      const sorted = result.current.sortedSessions;
      const paces = sorted.map(s => 
        s.status === 'planned' ? s.targetPace : s.avgPace
      );
      expect(paces).toEqual(['05:00', '05:30', '06:00', '06:30']);
    });

    it('should handle null paces (placed at the end)', () => {
      const sessions = [
        createCompletedSession({ id: '1', avgPace: '06:00' }),
        createCompletedSession({ id: '2', avgPace: null }),
        createCompletedSession({ id: '3', avgPace: '05:30' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('avgPace');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted[0].avgPace).toBe('05:30');
      expect(sorted[1].avgPace).toBe('06:00');
      expect(sorted[2].avgPace).toBeNull();
    });
  });

  describe('sorting by perceivedExertion', () => {
    it('should sort completed sessions by perceivedExertion descending', () => {
      const sessions = [
        createCompletedSession({ id: '1', perceivedExertion: 5 }),
        createCompletedSession({ id: '2', perceivedExertion: 8 }),
        createCompletedSession({ id: '3', perceivedExertion: 3 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('perceivedExertion');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.perceivedExertion)).toEqual([8, 5, 3]);
    });

    it('should sort planned sessions by targetRPE descending', () => {
      const sessions = [
        createPlannedSession({ id: '1', targetRPE: 5 }),
        createPlannedSession({ id: '2', targetRPE: 8 }),
        createPlannedSession({ id: '3', targetRPE: 3 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('perceivedExertion');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.targetRPE)).toEqual([8, 5, 3]);
    });

    it('should sort mixed completed and planned sessions by RPE', () => {
      const sessions = [
        createCompletedSession({ id: '1', perceivedExertion: 5 }),
        createPlannedSession({ id: '2', targetRPE: 8 }),
        createCompletedSession({ id: '3', perceivedExertion: 3 }),
        createPlannedSession({ id: '4', targetRPE: 6 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('perceivedExertion');
      });

      const sorted = result.current.sortedSessions;
      const rpes = sorted.map(s => 
        s.status === 'planned' ? s.targetRPE : s.perceivedExertion
      );
      expect(rpes).toEqual([8, 6, 5, 3]);
    });

    it('should handle null RPE values', () => {
      const sessions = [
        createCompletedSession({ id: '1', perceivedExertion: 5 }),
        createCompletedSession({ id: '2', perceivedExertion: null }),
        createCompletedSession({ id: '3', perceivedExertion: 3 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('perceivedExertion');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted[0].perceivedExertion).toBe(5);
      expect(sorted[1].perceivedExertion).toBe(3);
      expect(sorted[2].perceivedExertion).toBeNull();
    });
  });

  describe('sorting by duration', () => {
    it('should sort completed sessions by duration descending', () => {
      const sessions = [
        createCompletedSession({ id: '1', duration: '00:30:00' }),
        createCompletedSession({ id: '2', duration: '00:45:00' }),
        createCompletedSession({ id: '3', duration: '00:20:00' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('duration');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.duration)).toEqual(['00:45:00', '00:30:00', '00:20:00']);
    });

    it('should sort planned sessions by targetDuration descending', () => {
      const sessions = [
        createPlannedSession({ id: '1', targetDuration: 30 }),
        createPlannedSession({ id: '2', targetDuration: 45 }),
        createPlannedSession({ id: '3', targetDuration: 20 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('duration');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.targetDuration)).toEqual([45, 30, 20]);
    });

    it('should sort mixed completed and planned sessions by duration', () => {
      const sessions = [
        createCompletedSession({ id: '1', duration: '00:30:00' }),
        createPlannedSession({ id: '2', targetDuration: 45 }),
        createCompletedSession({ id: '3', duration: '00:20:00' }),
        createPlannedSession({ id: '4', targetDuration: 25 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('duration');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('4');
      expect(sorted[3].id).toBe('3');
    });
  });

  describe('sorting by distance', () => {
    it('should sort completed sessions by distance descending', () => {
      const sessions = [
        createCompletedSession({ id: '1', distance: 5 }),
        createCompletedSession({ id: '2', distance: 8 }),
        createCompletedSession({ id: '3', distance: 3 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('distance');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.distance)).toEqual([8, 5, 3]);
    });

    it('should sort planned sessions by targetDistance descending', () => {
      const sessions = [
        createPlannedSession({ id: '1', targetDistance: 5 }),
        createPlannedSession({ id: '2', targetDistance: 8 }),
        createPlannedSession({ id: '3', targetDistance: 3 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('distance');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.targetDistance)).toEqual([8, 5, 3]);
    });

    it('should sort mixed completed and planned sessions by distance', () => {
      const sessions = [
        createCompletedSession({ id: '1', distance: 5 }),
        createPlannedSession({ id: '2', targetDistance: 8 }),
        createCompletedSession({ id: '3', distance: 3 }),
        createPlannedSession({ id: '4', targetDistance: 6 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('distance');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.id)).toEqual(['2', '4', '1', '3']);
    });
  });

  describe('sorting by sessionType', () => {
    it('should sort by sessionType descending (case-insensitive)', () => {
      const sessions = [
        createCompletedSession({ id: '1', sessionType: 'Footing' }),
        createCompletedSession({ id: '2', sessionType: 'Fractionné' }),
        createCompletedSession({ id: '3', sessionType: 'Sortie longue' }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('sessionType');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.sessionType)).toEqual(['Sortie longue', 'Fractionné', 'Footing']);
    });
  });

  describe('sorting by week', () => {
    it('should sort by week descending', () => {
      const sessions = [
        createCompletedSession({ id: '1', week: 1 }),
        createCompletedSession({ id: '2', week: 3 }),
        createCompletedSession({ id: '3', week: 2 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('week');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted.map(s => s.week)).toEqual([3, 2, 1]);
    });

    it('should handle null weeks', () => {
      const sessions = [
        createCompletedSession({ id: '1', week: 1 }),
        createCompletedSession({ id: '2', week: null }),
        createCompletedSession({ id: '3', week: 2 }),
      ];
      const { result } = renderHook(() => useSessionsTableSort(sessions));
      
      act(() => {
        result.current.handleSort('week');
      });

      const sorted = result.current.sortedSessions;
      expect(sorted[0].week).toBe(2);
      expect(sorted[1].week).toBe(1);
      expect(sorted[2].week).toBeNull();
    });
  });
});