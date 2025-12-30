import type { AIRecommendedSession, TrainingSession } from '@/lib/types';

/**
 * Checks if a recommended session has already been added (planned or completed)
 */
export function isSessionAlreadyAdded(
  recommendedSession: AIRecommendedSession,
  allSessions: TrainingSession[]
): boolean {
  return allSessions.some(
    (s) => (s.status === 'planned' || s.status === 'completed') &&
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
    (s) => s.status === 'completed' &&
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
    (s) => s.status === 'planned' &&
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
    (s) => s.status === 'completed' &&
           s.recommendationId === recommendedSession.recommendation_id
  );
}

/**
 * Calculates the next available session number
 */
export function getNextSessionNumber(allSessions: TrainingSession[]): number {
  if (allSessions.length === 0) return 1;
  return Math.max(...allSessions.map(s => s.sessionNumber)) + 1;
}
