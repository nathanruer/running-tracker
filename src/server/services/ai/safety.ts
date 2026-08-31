import 'server-only';
import { logger } from '@/server/infrastructure/logger';
import { parseDuration, formatDuration } from '@/lib/utils/duration';
import { isFractionneType } from '@/lib/utils/session-type';
import type {
  AIResponseValidated,
  AIRecommendedSessionValidated,
} from '@/lib/validation/schemas/ai-response';
import type { AthleteForm } from './context/form-context';

/** A session may stretch half again the longest run of the last four weeks, no more. */
const LONGEST_RUN_FACTOR = 1.5;
/** The proposed week may add a fifth to what the athlete ran over the last seven days. */
const WEEKLY_VOLUME_FACTOR = 1.2;
/** Efforts may sharpen on the best recent pace by this much, and no faster than 2:30/km. */
const EFFORT_MARGIN_S = 20;
const ABSOLUTE_PACE_FLOOR_S = 150;
/** An easy run may run this much quicker than the recent easy average, not more. */
const EASY_MARGIN_S = 15;

function clampPace(pace: string | null | undefined, floor: number | null): string | null | undefined {
  if (!pace || !floor) return pace;
  const seconds = parseDuration(pace);
  if (!seconds || seconds >= floor) return pace;
  return formatDuration(floor);
}

function limitsFor(form: AthleteForm) {
  const effortFloor = form.bestRecentPaceSKm
    ? Math.max(ABSOLUTE_PACE_FLOOR_S, form.bestRecentPaceSKm - EFFORT_MARGIN_S)
    : null;
  const easyFloor = form.easyPaceSKm ? form.easyPaceSKm - EASY_MARGIN_S : null;

  return {
    effortFloor,
    easyFloor,
    maxDistanceKm: form.longestRunKm > 0 ? Math.round(form.longestRunKm * LONGEST_RUN_FACTOR * 10) / 10 : null,
    maxWeeklyKm: form.weeklyKm > 0 ? Math.round(form.weeklyKm * WEEKLY_VOLUME_FACTOR * 10) / 10 : null,
  };
}

function capSession(
  session: AIRecommendedSessionValidated,
  limits: ReturnType<typeof limitsFor>,
  clamped: string[]
): AIRecommendedSessionValidated {
  let next = session;
  const isInterval = isFractionneType(next.session_type ?? '');
  const floor = isInterval ? limits.effortFloor : limits.easyFloor;

  const pace = clampPace(next.target_pace_min_km, isInterval ? limits.easyFloor : floor);
  if (pace !== next.target_pace_min_km) {
    clamped.push(`allure ${next.target_pace_min_km} → ${pace}`);
    next = { ...next, target_pace_min_km: pace ?? undefined };
  }

  if (next.interval_details) {
    const details = next.interval_details;
    const effortPace = clampPace(details.targetEffortPace, limits.effortFloor);
    const steps = details.steps?.map((step) => {
      const stepFloor = step.stepType === 'effort' ? limits.effortFloor : limits.easyFloor;
      return { ...step, pace: clampPace(step.pace, stepFloor) ?? step.pace };
    });
    if (effortPace !== details.targetEffortPace) {
      clamped.push(`allure d'effort ${details.targetEffortPace} → ${effortPace}`);
    }
    next = { ...next, interval_details: { ...details, targetEffortPace: effortPace ?? null, steps } };
  }

  // Distance follows the pace so the card stays coherent, then the ceiling applies.
  const paceSeconds = parseDuration(next.target_pace_min_km ?? '');
  if (paceSeconds && typeof next.duration_min === 'number') {
    next = { ...next, estimated_distance_km: Math.round(((next.duration_min * 60) / paceSeconds) * 100) / 100 };
  }

  if (limits.maxDistanceKm && typeof next.estimated_distance_km === 'number' && next.estimated_distance_km > limits.maxDistanceKm) {
    clamped.push(`distance ${next.estimated_distance_km} km → ${limits.maxDistanceKm} km`);
    const duration = paceSeconds
      ? Math.round((limits.maxDistanceKm * paceSeconds) / 60)
      : next.duration_min;
    next = { ...next, estimated_distance_km: limits.maxDistanceKm, duration_min: duration };
  }

  return next;
}

/**
 * Keeps the coach inside what the athlete has actually run. The model is given these limits in its
 * context; this is the net underneath — a proposal that ignores them is brought back, never shown.
 */
export function applyFormLimits(
  response: AIResponseValidated,
  form: AthleteForm | null
): AIResponseValidated {
  if (!form || response.responseType !== 'recommendations') return response;

  const limits = limitsFor(form);
  const clamped: string[] = [];
  let sessions = response.recommended_sessions.map((session) => capSession(session, limits, clamped));

  const total = sessions.reduce((sum, session) => sum + (session.estimated_distance_km ?? 0), 0);
  if (limits.maxWeeklyKm && total > limits.maxWeeklyKm) {
    const ratio = limits.maxWeeklyKm / total;
    clamped.push(`volume de la semaine ${Math.round(total * 10) / 10} km → ${limits.maxWeeklyKm} km`);
    sessions = sessions.map((session) => {
      const distance = typeof session.estimated_distance_km === 'number'
        ? Math.round(session.estimated_distance_km * ratio * 100) / 100
        : session.estimated_distance_km;
      const duration = typeof session.duration_min === 'number'
        ? Math.round(session.duration_min * ratio)
        : session.duration_min;
      return { ...session, estimated_distance_km: distance, duration_min: duration };
    });
  }

  if (clamped.length) {
    logger.warn({ clamped, form }, 'coach-proposal-clamped');
  }

  return { ...response, recommended_sessions: sessions };
}
