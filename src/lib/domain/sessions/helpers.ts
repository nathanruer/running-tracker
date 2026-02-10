import type { AIRecommendedSession, TrainingSession } from '@/lib/types';
import { isCompleted, isPlanned } from '@/lib/domain/sessions/session-selectors';

/**
 * Checks if a recommended session has already been added (planned or completed)
 */
export function isSessionAlreadyAdded(
  recommendedSession: AIRecommendedSession,
  allSessions: TrainingSession[]
): boolean {
  return allSessions.some(
    (s) => (isPlanned(s) || isCompleted(s)) &&
           s.recommendationId === recommendedSession.recommendation_id
  );
}

/**
 * Checks if a recommended session has been completed
 */
export function isSessionCompleted(
  recommendedSession: AIRecommendedSession,
  allSessions: TrainingSession[]
): boolean {
  return allSessions.some(
    (s) => isCompleted(s) &&
           s.recommendationId === recommendedSession.recommendation_id
  );
}

/**
 * Retrieves the ID of a planned session from a recommendation
 */
export function getAddedSessionId(
  recommendedSession: AIRecommendedSession,
  allSessions: TrainingSession[]
): string | undefined {
  const session = allSessions.find(
    (s) => isPlanned(s) &&
           s.recommendationId === recommendedSession.recommendation_id
  );
  return session?.id;
}

/**
 * Retrieves a completed session from a recommendation
 */
export function getCompletedSession(
  recommendedSession: AIRecommendedSession,
  allSessions: TrainingSession[]
): TrainingSession | undefined {
  return allSessions.find(
    (s) => isCompleted(s) &&
           s.recommendationId === recommendedSession.recommendation_id
  );
}

export function getAddedSession(
  recommendedSession: AIRecommendedSession,
  allSessions: TrainingSession[]
): TrainingSession | undefined {
  return allSessions.find(
    (s) => (isPlanned(s) || isCompleted(s)) &&
           s.recommendationId === recommendedSession.recommendation_id
  );
}
