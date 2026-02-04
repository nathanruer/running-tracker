import 'server-only';
import { randomUUID } from 'crypto';
import { logger } from '@/server/infrastructure/logger';
import { validatePaceInput } from '@/lib/utils/pace';
import { validateAndAdjustDistance } from '@/lib/utils/distance';
import {
  aiResponseSchema,
  type AIResponseValidated,
  type AIRecommendedSessionValidated,
} from '@/lib/validation/schemas/ai-response';

export type ValidateResult =
  | { success: true; data: AIResponseValidated }
  | { success: false; error: string; fallback: AIResponseValidated };

export function validateAIResponse(raw: unknown): ValidateResult {
  const result = aiResponseSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessage = result.error.issues[0]?.message ?? 'Validation failed';
  return {
    success: false,
    error: errorMessage,
    fallback: {
      responseType: 'conversation',
      message: 'Erreur de format de réponse.',
    },
  };
}

function fixIntervalCount(session: AIRecommendedSessionValidated): AIRecommendedSessionValidated {
  const details = session.interval_details;
  if (!details?.steps || !details.repetitionCount) return session;

  const effortCount = details.steps.filter((s) => s.stepType === 'effort').length;
  if (effortCount !== details.repetitionCount) {
    return {
      ...session,
      interval_details: { ...details, repetitionCount: effortCount },
      interval_structure: session.interval_structure?.replace(
        /(\d+)x/,
        `${effortCount}x`
      ),
    };
  }
  return session;
}

function enrichSession(
  session: AIRecommendedSessionValidated,
  idx: number
): AIRecommendedSessionValidated {
  const recommendationId = randomUUID();
  const enriched = fixIntervalCount(session);

  if (
    typeof enriched.target_pace_min_km !== 'string' ||
    typeof enriched.duration_min !== 'number' ||
    typeof enriched.estimated_distance_km !== 'number'
  ) {
    return { ...enriched, recommendation_id: recommendationId };
  }

  if (!validatePaceInput(enriched.target_pace_min_km)) {
    logger.warn(
      { sessionIndex: idx + 1, invalidPace: enriched.target_pace_min_km },
      "Format d'allure invalide dans la réponse IA"
    );
    return { ...enriched, recommendation_id: recommendationId };
  }

  const adjustedDistance = validateAndAdjustDistance(
    enriched.duration_min,
    enriched.estimated_distance_km,
    enriched.target_pace_min_km
  );

  return {
    ...enriched,
    recommendation_id: recommendationId,
    estimated_distance_km: adjustedDistance,
  };
}

export function enrichRecommendations(response: AIResponseValidated): AIResponseValidated {
  if (response.responseType !== 'recommendations') {
    return response;
  }

  return {
    ...response,
    recommended_sessions: response.recommended_sessions.map(enrichSession),
  };
}

export function validateAndFixRecommendations(response: unknown): AIResponseValidated {
  const validationResult = validateAIResponse(response);
  const validatedResponse = validationResult.success
    ? validationResult.data
    : validationResult.fallback;

  return enrichRecommendations(validatedResponse);
}
