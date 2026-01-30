import type { TrainingSession } from '@/lib/types';
import type { FormValues } from '@/lib/validation/session-form';
import { getTodayISO, extractDatePart } from '@/lib/utils/date';
import { transformStepsData, getSessionDisplayData } from '@/lib/domain/forms/session-helpers';

export function initializeFormForComplete(
  session: TrainingSession,
  initialData: Partial<FormValues> | null
): Partial<FormValues> {
  const { date, ...importedFields } = initialData || {};
  const sessionDate = date ? extractDatePart(date) :
                      (session.date ? extractDatePart(session.date) : getTodayISO());

  const perceivedExertion = session.targetRPE || null;

  const sessionComments = session.comments || '';
  const importedComments = importedFields.comments || '';
  const comments = sessionComments || importedComments;

  const sessionHasIntervals = session.intervalDetails?.steps &&
    session.intervalDetails.steps.length > 0;

  const sessionTypeIsGeneric = !session.sessionType || session.sessionType === '-' || session.sessionType === 'Footing';
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
    stravaData: importedFields.stravaData ?? session.stravaData,
    externalId: importedFields.externalId ?? session.externalId,
    elevationGain: importedFields.elevationGain ?? session.elevationGain,
    averageCadence: importedFields.averageCadence ?? session.averageCadence,
    averageTemp: importedFields.averageTemp ?? session.averageTemp,
    calories: importedFields.calories ?? session.calories,
    workoutType: session.intervalDetails?.workoutType || importedFields.workoutType || '',
    repetitionCount: session.intervalDetails?.repetitionCount ?? importedFields.repetitionCount ?? undefined,
    effortDuration: session.intervalDetails?.effortDuration || importedFields.effortDuration || '',
    recoveryDuration: session.intervalDetails?.recoveryDuration || importedFields.recoveryDuration || '',
    effortDistance: session.intervalDetails?.effortDistance ?? importedFields.effortDistance ?? undefined,
    recoveryDistance: session.intervalDetails?.recoveryDistance ?? importedFields.recoveryDistance ?? undefined,
    targetEffortPace: session.intervalDetails?.targetEffortPace || importedFields.targetEffortPace || '',
    targetEffortHR: session.intervalDetails?.targetEffortHR ?? importedFields.targetEffortHR ?? undefined,
    targetRecoveryPace: session.intervalDetails?.targetRecoveryPace || importedFields.targetRecoveryPace || '',
    steps: sessionHasIntervals
      ? transformStepsData(session.intervalDetails?.steps)
      : (importedFields.steps || []),
  };
}

/**
 * Initialize the form to edit an existing session
 */
export function initializeFormForEdit(session: TrainingSession): Partial<FormValues> {
  const sessionDate = session.date ? extractDatePart(session.date) : '';
  const displayData = getSessionDisplayData(session);

  return {
    date: sessionDate,
    sessionType: session.sessionType,
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
    stravaData: session.stravaData,
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
      comments: '',
      ...importedFields,
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
    stravaData: null,
    elevationGain: null,
    averageCadence: null,
    averageTemp: null,
    calories: null,
  };
}
