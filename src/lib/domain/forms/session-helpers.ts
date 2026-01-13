import type {
  CompletedSessionUpdatePayload,
  PlannedSessionPayload,
  IntervalDetails,
  TrainingSession,
} from '@/lib/types';
import type { FormValues } from '@/lib/validation/session-form';
import {
  normalizeDurationToHHMMSS,
  convertDurationToMinutes,
  formatMinutesToHHMMSS,
} from '@/lib/utils/duration';

/**
 * Get display data for a session, using target values for planned sessions
 * and actual values for completed sessions.
 * This function centralizes the logic for getting the appropriate values to display.
 */
export function getSessionDisplayData(session: TrainingSession) {
  const isPlanned = session.status === 'planned';
  
  return {
    duration: isPlanned 
      ? (session.targetDuration ? formatMinutesToHHMMSS(session.targetDuration) : '') 
      : (session.duration || ''),
    distance: isPlanned 
      ? (session.targetDistance || 0) 
      : (session.distance || 0),
    avgPace: isPlanned 
      ? (session.targetPace || '') 
      : (session.avgPace || ''),
    avgHeartRate: isPlanned 
      ? (session.targetHeartRateBpm ? parseInt(session.targetHeartRateBpm) : 0) 
      : (session.avgHeartRate || 0),
    rpe: isPlanned 
      ? (session.targetRPE || null) 
      : (session.perceivedExertion || null),
  };
}

/**
 * Normalize all form durations to HH:MM:SS format
 */
export function normalizeFormValues(values: FormValues): FormValues {
  return {
    ...values,
    duration: normalizeDurationToHHMMSS(values.duration) || '',
    effortDuration: normalizeDurationToHHMMSS(values.effortDuration) || '',
    recoveryDuration: normalizeDurationToHHMMSS(values.recoveryDuration) || '',
    steps: values.steps?.map(s => ({
      ...s,
      duration: normalizeDurationToHHMMSS(s.duration)
    }))
  };
}

/**
 * Build the payload for a planned session
 */
export function buildPlannedSessionPayload(
  values: FormValues,
  normalizedValues: FormValues,
  intervalDetails: IntervalDetails | null,
  recommendationId?: string | null
): PlannedSessionPayload {
  const durationInMinutes = normalizedValues.duration
    ? convertDurationToMinutes(normalizedValues.duration)
    : null;

  return {
    date: values.date,
    sessionType: values.sessionType,
    targetDuration: durationInMinutes,
    targetDistance: values.distance ?? null,
    targetPace: values.avgPace || null,
    targetHeartRateBpm: values.avgHeartRate
      ? `${values.avgHeartRate}`
      : null,
    targetRPE: values.perceivedExertion ?? null,
    intervalDetails,
    comments: values.comments,
    externalId: values.externalId,
    source: values.source,
    recommendationId,
  };
}

/**
 * Build the payload for a completed session (for update)
 */
export function buildCompletedSessionPayload(
  values: FormValues,
  normalizedValues: FormValues,
  intervalDetails: IntervalDetails | null
): CompletedSessionUpdatePayload {
  return {
    sessionType: values.sessionType,
    duration: normalizedValues.duration,
    distance: values.distance ?? null,
    avgPace: values.avgPace,
    avgHeartRate: values.avgHeartRate ?? null,
    perceivedExertion: values.perceivedExertion ?? null,
    intervalDetails,
    comments: values.comments,
  };
}

/**
 * Transform interval steps from database format to form format
 */
export function transformStepsData(
  steps: Array<{
    stepNumber: number;
    stepType: 'warmup' | 'effort' | 'recovery' | 'cooldown';
    duration: string | null;
    distance: number | null;
    pace: string | null;
    hr: number | null;
  }> | undefined
): Array<{
  stepNumber: number;
  stepType: 'warmup' | 'effort' | 'recovery' | 'cooldown';
  duration: string | null;
  distance: number | null;
  pace: string | null;
  hr: number | null;
}> {
  if (!steps) return [];

  return steps.map(s => ({
    stepNumber: s.stepNumber,
    stepType: s.stepType,
    duration: s.duration || null,
    distance: s.distance ?? null,
    pace: s.pace || null,
    hr: s.hr ?? null,
  }));
}
