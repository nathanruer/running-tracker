import type { AIRecommendedSession, TrainingSession } from '@/lib/types';

/**
 * Vérifie si une séance recommandée a déjà été ajoutée (planifiée ou complétée)
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
 * Vérifie si une séance recommandée a été complétée
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
 * Récupère l'ID d'une séance planifiée à partir d'une recommandation
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
 * Récupère une séance complétée à partir d'une recommandation
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
 * Calcule le prochain numéro de séance disponible
 */
export function getNextSessionNumber(allSessions: TrainingSession[]): number {
  if (allSessions.length === 0) return 1;
  return Math.max(...allSessions.map(s => s.sessionNumber)) + 1;
}
