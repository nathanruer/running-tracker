import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSessionsSelection } from '../use-sessions-selection';
import type { TrainingSession } from '@/lib/types';

const createSession = (id: string): TrainingSession => ({
  id,
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
});

describe('useSessionsSelection', () => {
  describe('initialization', () => {
    it('should initialize with empty selection', () => {
      const sessions = [createSession('1'), createSession('2')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      expect(result.current.selectedSessions.size).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('toggleSessionSelection', () => {
    it('should add session to selection when not selected', () => {
      const sessions = [createSession('1'), createSession('2')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSessionSelection('1');
      });
      
      expect(result.current.selectedSessions.has('1')).toBe(true);
      expect(result.current.selectedSessions.size).toBe(1);
    });

    it('should remove session from selection when already selected', () => {
      const sessions = [createSession('1'), createSession('2')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSessionSelection('1');
      });
      
      act(() => {
        result.current.toggleSessionSelection('1');
      });
      
      expect(result.current.selectedSessions.has('1')).toBe(false);
      expect(result.current.selectedSessions.size).toBe(0);
    });

    it('should handle multiple sessions', () => {
      const sessions = [createSession('1'), createSession('2'), createSession('3')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSessionSelection('1');
      });
      
      act(() => {
        result.current.toggleSessionSelection('2');
      });
      
      expect(result.current.selectedSessions.size).toBe(2);
      expect(result.current.selectedSessions.has('1')).toBe(true);
      expect(result.current.selectedSessions.has('2')).toBe(true);
      expect(result.current.selectedSessions.has('3')).toBe(false);
    });
  });

  describe('toggleSelectAll', () => {
    it('should select all sessions when none are selected', () => {
      const sessions = [createSession('1'), createSession('2'), createSession('3')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSelectAll();
      });
      
      expect(result.current.selectedSessions.size).toBe(3);
      expect(result.current.selectedSessions.has('1')).toBe(true);
      expect(result.current.selectedSessions.has('2')).toBe(true);
      expect(result.current.selectedSessions.has('3')).toBe(true);
      expect(result.current.isAllSelected).toBe(true);
    });

    it('should deselect all sessions when all are selected', () => {
      const sessions = [createSession('1'), createSession('2'), createSession('3')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSelectAll();
      });
      
      act(() => {
        result.current.toggleSelectAll();
      });
      
      expect(result.current.selectedSessions.size).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });

    it('should select all sessions when some are selected', () => {
      const sessions = [createSession('1'), createSession('2'), createSession('3')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSessionSelection('1');
      });
      
      act(() => {
        result.current.toggleSelectAll();
      });
      
      expect(result.current.selectedSessions.size).toBe(3);
      expect(result.current.isAllSelected).toBe(true);
    });

    it('should handle empty sessions array', () => {
      const sessions: TrainingSession[] = [];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSelectAll();
      });
      
      expect(result.current.selectedSessions.size).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected sessions', () => {
      const sessions = [createSession('1'), createSession('2'), createSession('3')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSessionSelection('1');
      });
      
      act(() => {
        result.current.toggleSessionSelection('2');
      });
      
      expect(result.current.selectedSessions.size).toBe(2);
      
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedSessions.size).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('isAllSelected', () => {
    it('should return false when no sessions are selected', () => {
      const sessions = [createSession('1'), createSession('2')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      expect(result.current.isAllSelected).toBe(false);
    });

    it('should return false when some sessions are selected', () => {
      const sessions = [createSession('1'), createSession('2'), createSession('3')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSessionSelection('1');
      });
      
      expect(result.current.isAllSelected).toBe(false);
    });

    it('should return true when all sessions are selected', () => {
      const sessions = [createSession('1'), createSession('2')];
      const { result } = renderHook(() => useSessionsSelection(sessions));
      
      act(() => {
        result.current.toggleSelectAll();
      });
      
      expect(result.current.isAllSelected).toBe(true);
    });
  });
});


