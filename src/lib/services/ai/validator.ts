import { randomUUID } from 'crypto';
import { logger } from '@/lib/infrastructure/logger';
import type { AIResponse, AIRecommendedSession } from '@/lib/types/ai';
import { parseDuration, validatePaceInput } from '@/lib/utils/duration';


/**
 * Validates and fixes AI-generated training recommendations
 * Ensures distance calculations are consistent with pace and duration
 * Adds unique IDs to each recommendation
 *
 * @param response Raw AI response object
 * @returns Validated and corrected response with recommendation IDs
 */
export function validateAndFixRecommendations(response: AIResponse): AIResponse {
  // Only process recommendation responses
  if (
    response.responseType !== 'recommendations' ||
    !Array.isArray(response.recommended_sessions)
  ) {
    return response;
  }

  response.recommended_sessions = response.recommended_sessions.map(
    (session: AIRecommendedSession, idx: number) => {
      const recommendationId = randomUUID();

      if (
        typeof session.target_pace_min_km !== 'string' ||
        typeof session.duration_min !== 'number' ||
        typeof session.estimated_distance_km !== 'number'
      ) {
        return { ...session, recommendation_id: recommendationId };
      }

      if (!validatePaceInput(session.target_pace_min_km)) {
        logger.warn(
          {
            sessionIndex: idx + 1,
            invalidPace: session.target_pace_min_km,
          },
          'Format d\'allure invalide dans la réponse IA'
        );
        return { ...session, recommendation_id: recommendationId };
      }

      const paceSeconds = parseDuration(session.target_pace_min_km);
      if (paceSeconds === null) {
        return { ...session, recommendation_id: recommendationId };
      }
      const paceMinutesPerKm = paceSeconds / 60;
      const expectedDistance = session.duration_min / paceMinutesPerKm;

      const diff =
        Math.abs(session.estimated_distance_km - expectedDistance) /
        expectedDistance;

      if (diff > 0.05) {
        logger.warn(
          {
            sessionIndex: idx + 1,
            distanceAI: session.estimated_distance_km,
            distanceCorrected: expectedDistance,
          },
          'Correction distance incohérente IA'
        );

        session.estimated_distance_km =
          Math.round(expectedDistance * 100) / 100;
      }

      return { ...session, recommendation_id: recommendationId };
    }
  );

  return response;
}
