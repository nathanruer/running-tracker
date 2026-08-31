import 'server-only';
import { applyFormLimits } from './safety';
import type { AthleteForm } from './context/form-context';
import { randomUUID } from 'crypto';
import { logger } from '@/server/infrastructure/logger';
import { validatePaceInput } from '@/lib/utils/pace';
import { validateAndAdjustDistance } from '@/lib/utils/distance';
import { parseDuration } from '@/lib/utils/duration';
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

const DEFAULT_RPE_BY_WORKOUT_TYPE: Record<string, number> = {
  VMA: 8,
  SEUIL: 7,
  TEMPO: 6,
};

function defaultRpeFor(session: AIRecommendedSessionValidated): number {
  const type = (session.session_type ?? '').toLowerCase();
  if (type.includes('longue')) return 5;
  if (type.includes('footing')) return 3;
  const workoutType = session.interval_details?.workoutType?.toUpperCase() ?? '';
  return DEFAULT_RPE_BY_WORKOUT_TYPE[workoutType] ?? 7;
}

function normalizeIntervalDetails(
  session: AIRecommendedSessionValidated
): AIRecommendedSessionValidated {
  const details = session.interval_details;
  if (!details?.steps || details.steps.length === 0) return session;

  const steps = details.steps.map((step, index) => ({
    ...step,
    stepNumber: step.stepNumber ?? index + 1,
  }));

  const effortStep = steps.find((step) => step.stepType === 'effort');

  const totalKm = steps.reduce(
    (sum, step) => sum + (typeof step.distance === 'number' ? step.distance : 0),
    0
  );
  const totalSeconds = steps.reduce(
    (sum, step) => sum + (step.duration ? parseDuration(step.duration) ?? 0 : 0),
    0
  );

  return {
    ...session,
    interval_details: {
      ...details,
      effortDistance: details.effortDistance ?? effortStep?.distance ?? null,
      steps,
    },
    ...(totalKm > 0 ? { estimated_distance_km: Math.round(totalKm * 100) / 100 } : {}),
    ...(totalSeconds > 0 ? { duration_min: Math.round(totalSeconds / 60) } : {}),
  };
}

function enrichSession(
  session: AIRecommendedSessionValidated,
  idx: number
): AIRecommendedSessionValidated {
  const recommendationId = randomUUID();
  let enriched = fixIntervalCount(session);
  const hasSteps = Boolean(enriched.interval_details?.steps?.length);
  enriched = normalizeIntervalDetails(enriched);

  if (enriched.target_rpe == null) {
    enriched = { ...enriched, target_rpe: defaultRpeFor(enriched) };
  }

  if (
    hasSteps ||
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

export function validateAndFixRecommendations(
  response: unknown,
  form: AthleteForm | null = null
): AIResponseValidated {
  const validationResult = validateAIResponse(response);
  const validatedResponse = validationResult.success
    ? validationResult.data
    : validationResult.fallback;

  return applyFormLimits(enrichRecommendations(validatedResponse), form);
}
