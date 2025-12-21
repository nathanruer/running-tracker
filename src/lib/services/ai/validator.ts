import { randomUUID } from 'crypto';
import { logger } from '@/lib/infrastructure/logger';
import type { AIResponse, AIRecommendedSession } from './types';

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

      // Validate session has required fields with correct types
      if (
        typeof session.target_pace_min_km !== 'string' ||
        typeof session.duration_min !== 'number' ||
        typeof session.estimated_distance_km !== 'number'
      ) {
        return { ...session, recommendation_id: recommendationId };
      }

      // Parse pace (format: "MM:SS")
      const match = session.target_pace_min_km.match(/^(\d+):(\d+)$/);
      if (!match) {
        return { ...session, recommendation_id: recommendationId };
      }

      // Calculate expected distance based on pace and duration
      const paceMinutesPerKm =
        parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
      const expectedDistance = session.duration_min / paceMinutesPerKm;

      // Check if AI's distance estimate is significantly off
      const diff =
        Math.abs(session.estimated_distance_km - expectedDistance) /
        expectedDistance;

      // If difference > 5%, correct it and log warning
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
