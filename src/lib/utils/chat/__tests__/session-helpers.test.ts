import { describe, it, expect } from 'vitest';
import {
  isSessionAlreadyAdded,
  isSessionCompleted,
  getAddedSessionId,
  getCompletedSession,
  getNextSessionNumber,
} from '../session-helpers';
import type { AIRecommendedSession, TrainingSession } from '@/lib/types';

const mockRecommendedSession: AIRecommendedSession = {
  recommendation_id: 'rec-1',
  session_type: 'Endurance fondamentale',
  duration_min: 45,
  duration_minutes: 45,
  estimated_distance_km: 8,
  target_pace_min_km: '5:30',
};

const mockSessions: TrainingSession[] = [
  {
    id: 'session-1',
    sessionNumber: 1,
    status: 'completed',
    recommendationId: 'rec-1',
    sessionType: 'Endurance fondamentale',
  } as TrainingSession,
  {
    id: 'session-2',
    sessionNumber: 2,
    status: 'planned',
    recommendationId: 'rec-2',
    sessionType: 'Fractionné',
  } as TrainingSession,
  {
    id: 'session-3',
    sessionNumber: 3,
    status: 'completed',
    recommendationId: null,
    sessionType: 'Sortie longue',
  } as TrainingSession,
];

describe('session-helpers', () => {
  describe('isSessionAlreadyAdded', () => {
    it('should return true when session is completed', () => {
      expect(isSessionAlreadyAdded(mockRecommendedSession, mockSessions)).toBe(true);
    });

    it('should return true when session is planned', () => {
      const plannedSession: AIRecommendedSession = {
        ...mockRecommendedSession,
        recommendation_id: 'rec-2',
      };
      expect(isSessionAlreadyAdded(plannedSession, mockSessions)).toBe(true);
    });

    it('should return false when session is not added', () => {
      const newSession: AIRecommendedSession = {
        ...mockRecommendedSession,
        recommendation_id: 'rec-999',
      };
      expect(isSessionAlreadyAdded(newSession, mockSessions)).toBe(false);
    });
  });

  describe('isSessionCompleted', () => {
    it('should return true when session is completed', () => {
      expect(isSessionCompleted(mockRecommendedSession, mockSessions)).toBe(true);
    });

    it('should return false when session is only planned', () => {
      const plannedSession: AIRecommendedSession = {
        ...mockRecommendedSession,
        recommendation_id: 'rec-2',
      };
      expect(isSessionCompleted(plannedSession, mockSessions)).toBe(false);
    });

    it('should return false when session does not exist', () => {
      const newSession: AIRecommendedSession = {
        ...mockRecommendedSession,
        recommendation_id: 'rec-999',
      };
      expect(isSessionCompleted(newSession, mockSessions)).toBe(false);
    });
  });

  describe('getAddedSessionId', () => {
    it('should return session ID when session is planned', () => {
      const plannedSession: AIRecommendedSession = {
        ...mockRecommendedSession,
        recommendation_id: 'rec-2',
      };
      expect(getAddedSessionId(plannedSession, mockSessions)).toBe('session-2');
    });

    it('should return undefined when session is completed', () => {
      expect(getAddedSessionId(mockRecommendedSession, mockSessions)).toBeUndefined();
    });

    it('should return undefined when session does not exist', () => {
      const newSession: AIRecommendedSession = {
        ...mockRecommendedSession,
        recommendation_id: 'rec-999',
      };
      expect(getAddedSessionId(newSession, mockSessions)).toBeUndefined();
    });
  });

  describe('getCompletedSession', () => {
    it('should return session when it is completed', () => {
      const result = getCompletedSession(mockRecommendedSession, mockSessions);
      expect(result).toBeDefined();
      expect(result?.id).toBe('session-1');
    });

    it('should return undefined when session is only planned', () => {
      const plannedSession: AIRecommendedSession = {
        ...mockRecommendedSession,
        recommendation_id: 'rec-2',
      };
      expect(getCompletedSession(plannedSession, mockSessions)).toBeUndefined();
    });

    it('should return undefined when session does not exist', () => {
      const newSession: AIRecommendedSession = {
        ...mockRecommendedSession,
        recommendation_id: 'rec-999',
      };
      expect(getCompletedSession(newSession, mockSessions)).toBeUndefined();
    });
  });

  describe('getNextSessionNumber', () => {
    it('should return 1 when no sessions exist', () => {
      expect(getNextSessionNumber([])).toBe(1);
    });

    it('should return next session number', () => {
      expect(getNextSessionNumber(mockSessions)).toBe(4);
    });

    it('should handle single session', () => {
      const singleSession: TrainingSession[] = [
        {
          id: 'session-1',
          sessionNumber: 1,
          status: 'completed',
        } as TrainingSession,
      ];
      expect(getNextSessionNumber(singleSession)).toBe(2);
    });
  });
});
