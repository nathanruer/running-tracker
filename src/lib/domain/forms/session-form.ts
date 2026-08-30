import type { IntervalDetails, TrainingSession } from '@/lib/types';
import type { FormValues } from '@/lib/validation/session-form';
import { getTodayISO, extractDatePart } from '@/lib/utils/date';
import { transformStepsData, getSessionDisplayData } from '@/lib/domain/forms/session-helpers';
import { transformIntervalData } from '@/lib/utils/intervals';
import { normalizeDurationToHHMMSS } from '@/lib/utils/duration';

/** Garmin names every activity "<lieu ou moment> Course à pied" — not worth carrying as a note. */
const PROVIDER_DEFAULT_NAME = /(course à pied|run|running)$/i;

export function importedComment(comment: string | null | undefined): string {
  const name = comment?.trim() ?? '';
  return PROVIDER_DEFAULT_NAME.test(name) ? '' : name;
}

/** Spreads intervals coming from an import into the flat fields the form edits. */
export function intervalDetailsToFormFields(
  details: IntervalDetails | null | undefined
): Partial<FormValues> {
  if (!details) return {};

  return {
    workoutType: details.workoutType ?? '',
    repetitionCount: details.repetitionCount ?? undefined,
    effortDuration: details.effortDuration ?? '',
    recoveryDuration: details.recoveryDuration ?? '',
    effortDistance: details.effortDistance ?? undefined,
    recoveryDistance: details.recoveryDistance ?? undefined,
    targetEffortPace: details.targetEffortPace ?? '',
    targetEffortHR: details.targetEffortHR ?? undefined,
    targetRecoveryPace: details.targetRecoveryPace ?? '',
    steps: transformStepsData(details.steps ?? undefined),
  };
}

/** Same durations written the same way on both sides, so only real edits show up as differences. */
function comparableIntervals(details: IntervalDetails | null): string {
  if (!details) return '';

  return JSON.stringify({
    ...details,
    effortDuration: normalizeDurationToHHMMSS(details.effortDuration),
    recoveryDuration: normalizeDurationToHHMMSS(details.recoveryDuration),
    steps: details.steps?.map((step) => ({ ...step, duration: normalizeDurationToHHMMSS(step.duration) })),
  });
}

/**
 * Provenance of the intervals being saved: `detected` while they are exactly the ones the provider
 * proposed, `manual` as soon as the athlete changed something (jobs never overwrite manual rows).
 */
export function intervalsProvenance(
  initialData: Partial<FormValues> | null | undefined,
  submitted: IntervalDetails | null
): 'detected' | 'manual' {
  if (!submitted || !initialData?.source || initialData.source === 'manual') return 'manual';

  const detected = transformIntervalData(
    { ...initialData, sessionType: initialData.sessionType ?? '' },
    'detailed'
  );
  return detected && comparableIntervals(detected) === comparableIntervals(submitted)
    ? 'detected'
    : 'manual';
}

export function initializeFormForComplete(
  session: TrainingSession,
  initialData: Partial<FormValues> | null
): Partial<FormValues> {
  const { date, ...importedFields } = initialData || {};
  const sessionDate = date ? extractDatePart(date) :
                      (session.localDate ?? (session.date ? extractDatePart(session.date) : getTodayISO()));

  const perceivedExertion = session.targetRPE || null;

  const sessionComments = session.comments || '';
  const comments = sessionComments || importedComment(importedFields.comments);

  // Completing a planned session: what the watch recorded wins over what the coach had planned. A
  // full detected set replaces the plan; a partial one (steps only) just fills in what it carries.
  const importedSteps = transformStepsData(importedFields.steps);
  const sessionHasIntervals = Boolean(session.intervalDetails?.steps?.length);
  const planned = importedFields.workoutType && importedSteps.length ? null : session.intervalDetails;

  const intervals = {
    workoutType: importedFields.workoutType || planned?.workoutType || '',
    repetitionCount: importedFields.repetitionCount ?? planned?.repetitionCount ?? undefined,
    effortDuration: importedFields.effortDuration || planned?.effortDuration || '',
    recoveryDuration: importedFields.recoveryDuration || planned?.recoveryDuration || '',
    effortDistance: importedFields.effortDistance ?? planned?.effortDistance ?? undefined,
    recoveryDistance: importedFields.recoveryDistance ?? planned?.recoveryDistance ?? undefined,
    targetEffortPace: importedFields.targetEffortPace || planned?.targetEffortPace || '',
    targetEffortHR: importedFields.targetEffortHR ?? planned?.targetEffortHR ?? undefined,
    targetRecoveryPace: importedFields.targetRecoveryPace || planned?.targetRecoveryPace || '',
    steps: importedSteps.length
      ? importedSteps
      : (sessionHasIntervals ? transformStepsData(session.intervalDetails?.steps) : []),
  };

  const sessionTypeIsGeneric = !session.sessionType || session.sessionType === 'Footing';
  const sessionType = sessionTypeIsGeneric && importedFields.sessionType
    ? importedFields.sessionType
    : session.sessionType || 'Footing';

  return {
    date: sessionDate,
    perceivedExertion,
    comments,
    duration: importedFields.duration || '',
    distance: importedFields.distance ?? null,
    avgPace: importedFields.avgPace || '',
    avgHeartRate: importedFields.avgHeartRate ?? null,
    sessionType,
    source: importedFields.source ?? session.source,
    startedAt: importedFields.startedAt ?? session.startedAt ?? null,
    routePolyline: importedFields.routePolyline ?? session.routePolyline ?? null,
    maxHeartRate: importedFields.maxHeartRate ?? session.maxHeartRate ?? null,
    sourcePayload: importedFields.sourcePayload ?? null,
    sources: importedFields.sources,
    externalId: importedFields.externalId ?? session.externalId,
    elevationGain: importedFields.elevationGain ?? session.elevationGain,
    averageCadence: importedFields.averageCadence ?? session.averageCadence,
    averageTemp: importedFields.averageTemp ?? session.averageTemp,
    calories: importedFields.calories ?? session.calories,
    ...intervals,
  };
}

/**
 * Initialize the form to edit an existing session
 */
export function initializeFormForEdit(session: TrainingSession): Partial<FormValues> {
  const sessionDate = session.localDate ?? (session.date
    ? extractDatePart(session.date)
    : (session.plannedDate ? extractDatePart(session.plannedDate) : ''));
  const displayData = getSessionDisplayData(session);

  return {
    date: sessionDate,
    sessionType: session.sessionType || '',
    duration: displayData.duration || '00:00:00',
    distance: displayData.distance,
    avgPace: displayData.avgPace || '00:00',
    avgHeartRate: displayData.avgHeartRate,
    perceivedExertion: displayData.rpe,
    comments: session.comments || '',
    workoutType: session.intervalDetails?.workoutType || '',
    repetitionCount: session.intervalDetails?.repetitionCount || undefined,
    effortDuration: session.intervalDetails?.effortDuration || '',
    recoveryDuration: session.intervalDetails?.recoveryDuration || '',
    effortDistance: session.intervalDetails?.effortDistance || undefined,
    recoveryDistance: session.intervalDetails?.recoveryDistance || undefined,
    targetEffortPace: session.intervalDetails?.targetEffortPace || '',
    targetEffortHR: session.intervalDetails?.targetEffortHR || undefined,
    targetRecoveryPace: session.intervalDetails?.targetRecoveryPace || '',
    steps: transformStepsData(session.intervalDetails?.steps) || [],
    externalId: session.externalId,
    source: session.source,
    startedAt: session.startedAt ?? null,
    routePolyline: session.routePolyline ?? null,
    maxHeartRate: session.maxHeartRate ?? null,
    sourcePayload: null,
    elevationGain: session.elevationGain,
    averageCadence: session.averageCadence,
    averageTemp: session.averageTemp,
    calories: session.calories,
  };
}

/**
 * Initialize the form to create a new session
 */
export function initializeFormForCreate(
  initialData?: Partial<FormValues> | null
): Partial<FormValues> {
  if (initialData) {
    const { date, ...importedFields } = initialData;
    return {
      date: date ? extractDatePart(date) : getTodayISO(),
      duration: '',
      distance: null,
      avgPace: '',
      avgHeartRate: null,
      perceivedExertion: null,
      ...importedFields,
      comments: importedComment(importedFields.comments),
      sessionType: importedFields.sessionType || 'Footing',
    };
  }

  return {
    date: getTodayISO(),
    sessionType: 'Footing',
    duration: '',
    distance: null,
    avgPace: '',
    avgHeartRate: null,
    perceivedExertion: null,
    comments: '',
    externalId: null,
    source: 'manual',
    startedAt: null,
    routePolyline: null,
    maxHeartRate: null,
    sourcePayload: null,
    elevationGain: null,
    averageCadence: null,
    averageTemp: null,
    calories: null,
  };
}
