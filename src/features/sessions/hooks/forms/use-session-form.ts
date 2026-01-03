import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { addSession, updateSession } from '@/lib/services/api-client';
import type { TrainingSessionPayload, TrainingSession } from '@/lib/types';
import { formSchema, type FormValues } from '@/lib/validation/session-form';
import { PREDEFINED_TYPES } from '@/features/sessions/components/forms/session-type-selector';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import { transformIntervalData } from '@/lib/utils/intervals';
import { getTodayISO, extractDatePart } from '@/lib/utils/formatters';
import { calculatePaceFromDurationAndDistance, normalizeDurationToHHMMSS } from '@/lib/utils/duration';

interface UseSessionFormProps {
  mode: 'create' | 'edit' | 'complete';
  session?: TrainingSession | null;
  initialData?: Partial<FormValues> | null;
  onSuccess?: (session: TrainingSession) => void;
  onClose: () => void;
}

export function useSessionForm({ mode, session, initialData, onSuccess, onClose }: UseSessionFormProps) {
  const { handleError, handleSuccess } = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [isCustomSessionType, setIsCustomSessionType] = useState(false);
  const [intervalEntryMode, setIntervalEntryMode] = useState<'quick' | 'detailed'>('quick');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: getTodayISO(),
      sessionType: 'Footing',
      duration: '',
      distance: null,
      avgPace: '',
      avgHeartRate: null,
      perceivedExertion: null,
      comments: '',
      workoutType: '',
      repetitionCount: undefined,
      effortDuration: '',
      recoveryDuration: '',
      effortDistance: undefined,
      recoveryDistance: undefined,
      targetEffortPace: '',
      targetEffortHR: undefined,
      targetRecoveryPace: '',
      steps: [],
      externalId: null,
      source: 'manual',
      stravaData: null,
      elevationGain: null,
      maxElevation: null,
      minElevation: null,
      averageCadence: null,
      averageTemp: null,
      calories: null,
    },
  });

  const watchedDuration = useWatch({ control: form.control, name: 'duration' });
  const watchedDistance = useWatch({ control: form.control, name: 'distance' });

  useEffect(() => {
    if (watchedDuration && watchedDistance) {
      const pace = calculatePaceFromDurationAndDistance(watchedDuration, watchedDistance);
      if (pace) {
        const currentPace = form.getValues('avgPace');
        if (currentPace !== pace) {
             form.setValue('avgPace', pace, { shouldValidate: true, shouldDirty: true });
        }
      }
    }
  }, [watchedDuration, watchedDistance, form]);

  useEffect(() => {
    const predefinedTypes = PREDEFINED_TYPES;

    if (session && mode === 'complete' && initialData) {
      const { date, ...importedFields } = initialData;
      const sessionDate = date ? extractDatePart(date) :
                          (session.date ? extractDatePart(session.date) : getTodayISO());

      const perceivedExertion = session.targetRPE || null;

      form.reset({
        date: sessionDate,
        perceivedExertion,
        comments: session.comments || '',
        duration: '',
        distance: null,
        avgPace: '',
        avgHeartRate: null,
        ...importedFields,
        sessionType: importedFields.sessionType || session.sessionType || 'Footing',
        source: importedFields.source ?? session.source,
        stravaData: importedFields.stravaData ?? session.stravaData,
        elevationGain: importedFields.elevationGain ?? session.elevationGain,
        maxElevation: importedFields.maxElevation ?? session.maxElevation,
        minElevation: importedFields.minElevation ?? session.minElevation,
        averageCadence: importedFields.averageCadence ?? session.averageCadence,
        averageTemp: importedFields.averageTemp ?? session.averageTemp,
        calories: importedFields.calories ?? session.calories,
      });
      setIsCustomSessionType(!predefinedTypes.includes(session.sessionType) && session.sessionType !== '');
    } else if (session && (mode === 'edit' || mode === 'complete')) {
      const sessionDate = session.date ? extractDatePart(session.date) : '';

      const isPlanned = session.status === 'planned';
      const duration = isPlanned && session.targetDuration
        ? `${Math.floor(session.targetDuration / 60).toString().padStart(2, '0')}:${(session.targetDuration % 60).toString().padStart(2, '0')}:00`
        : session.duration || '00:00:00';
      const distance = isPlanned && session.targetDistance
        ? session.targetDistance
        : session.distance || 0;
      const avgPace = isPlanned && session.targetPace
        ? session.targetPace
        : session.avgPace || '00:00';
      const avgHeartRate = isPlanned && session.targetHeartRateBpm
        ? parseInt(session.targetHeartRateBpm)
        : session.avgHeartRate || 0;
      const perceivedExertion = isPlanned && session.targetRPE
        ? session.targetRPE
        : session.perceivedExertion || null;

      form.reset({
        date: sessionDate,
        sessionType: session.sessionType,
        duration,
        distance,
        avgPace,
        avgHeartRate,
        perceivedExertion,
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
        steps: session.intervalDetails?.steps?.map(s => ({
          stepNumber: s.stepNumber,
          stepType: s.stepType,
          duration: s.duration || null,
          distance: s.distance ?? null,
          pace: s.pace || null,
          hr: s.hr ?? null,
        })) || [],
        externalId: session.externalId,
        source: session.source,
        stravaData: session.stravaData,
        elevationGain: session.elevationGain,
        maxElevation: session.maxElevation,
        minElevation: session.minElevation,
        averageCadence: session.averageCadence,
        averageTemp: session.averageTemp,
        calories: session.calories,
      });
      setIsCustomSessionType(!predefinedTypes.includes(session.sessionType) && session.sessionType !== '');
    } else if (initialData) {
      const { date, ...importedFields } = initialData;
      form.reset({
        date: date ? extractDatePart(date) : getTodayISO(),
        duration: '',
        distance: null,
        avgPace: '',
        avgHeartRate: null,
        perceivedExertion: null,
        comments: '',
        ...importedFields,
        sessionType: importedFields.sessionType || 'Footing',
      });
      setIsCustomSessionType(false);
    } else {
      form.reset({
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
        maxElevation: null,
        minElevation: null,
        averageCadence: null,
        averageTemp: null,
        calories: null,
      });
      setIsCustomSessionType(false);
    }
  }, [session, initialData, mode, form]);

  interface ValidationErrorDetail {
    path: (string | number)[];
    message: string;
  }

  interface ValidationError extends Error {
    details?: ValidationErrorDetail[];
  }

  const handleFormError = (error: unknown) => {
    if (error instanceof Error && 'details' in error && Array.isArray((error as ValidationError).details)) {
      const details = (error as ValidationError).details || [];

      details.forEach((err) => {
        if (err.path && Array.isArray(err.path)) {
          const pathParts = [...err.path];
          if (pathParts[0] === 'intervalDetails') {
            pathParts.shift();
          }

          const fieldName = pathParts.join('.');

          let message = err.message;
          if (message.includes('expected number') || message.includes('received null')) {
            message = 'Ce champ est requis';
          } else if (message.includes('expected string') && message.includes('received ""')) {
            message = 'Ce champ est requis';
          } else if (message.includes('invalid_type')) {
            message = 'Type invalide';
          }

          form.setError(fieldName as keyof FormValues, {
            type: 'server',
            message: message
          });
        }
      });

      return;
    }

    handleError(error, 'Une erreur est survenue lors de l\'enregistrement.');
  };

  const onUpdate = async (values: FormValues) => {
    if (!session) return;

    setLoading(true);
    try {
      // Normalize durations to HH:MM:SS
      const normalizedValues: FormValues = {
        ...values,
        duration: normalizeDurationToHHMMSS(values.duration) || '',
        effortDuration: normalizeDurationToHHMMSS(values.effortDuration) || '',
        recoveryDuration: normalizeDurationToHHMMSS(values.recoveryDuration) || '',
        steps: values.steps?.map(s => ({
          ...s,
          duration: normalizeDurationToHHMMSS(s.duration)
        }))
      };

      const intervalDetails = transformIntervalData(normalizedValues, intervalEntryMode);
      const sessionData: TrainingSessionPayload = {
        date: values.date,
        sessionType: values.sessionType,
        duration: normalizedValues.duration,
        distance: values.distance ?? null,
        avgPace: values.avgPace,
        avgHeartRate: values.avgHeartRate ?? null,
        intervalDetails,
        perceivedExertion: values.perceivedExertion,
        comments: values.comments,
        externalId: values.externalId,
        source: values.source,
        stravaData: values.stravaData,
        elevationGain: values.elevationGain,
        maxElevation: values.maxElevation,
        minElevation: values.minElevation,
        averageCadence: values.averageCadence,
        averageTemp: values.averageTemp,
        calories: values.calories,
      };

      const updatedSession = await updateSession(session.id, sessionData);

      const type = values.sessionType.toLowerCase();
      const dist = values.distance ? ` de ${values.distance}km` : '';
      handleSuccess('Séance modifiée', `Votre séance ${type}${dist} a été mise à jour avec succès.`);
      if (onSuccess) onSuccess(updatedSession);
      onClose();
      form.reset();
    } catch (error) {
      handleFormError(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!values.date) {
      handleError(new Error('La date est requise pour marquer une séance comme réalisée'));
      return;
    }

    setLoading(true);
    try {
      const normalizedValues: FormValues = {
        ...values,
        duration: normalizeDurationToHHMMSS(values.duration) || '',
        effortDuration: normalizeDurationToHHMMSS(values.effortDuration) || '',
        recoveryDuration: normalizeDurationToHHMMSS(values.recoveryDuration) || '',
        steps: values.steps?.map(s => ({
          ...s,
          duration: normalizeDurationToHHMMSS(s.duration)
        }))
      };

      const intervalDetails = transformIntervalData(normalizedValues, intervalEntryMode);
      const sessionData: TrainingSessionPayload = {
        date: values.date,
        sessionType: values.sessionType,
        duration: normalizedValues.duration,
        distance: values.distance ?? null,
        avgPace: values.avgPace,
        avgHeartRate: values.avgHeartRate ?? null,
        intervalDetails,
        perceivedExertion: values.perceivedExertion,
        comments: values.comments,
        externalId: values.externalId,
        source: values.source,
        stravaData: values.stravaData,
        elevationGain: values.elevationGain,
        maxElevation: values.maxElevation,
        minElevation: values.minElevation,
        averageCadence: values.averageCadence,
        averageTemp: values.averageTemp,
        calories: values.calories,
      };

      const type = values.sessionType.toLowerCase();
      const dist = values.distance ? ` de ${values.distance}km` : '';

      let resultSession: TrainingSession;

      if (mode === 'complete' && session) {
        const response = await fetch(`/api/sessions/${session.id}/complete`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        });

        const data = await response.json();

        if (!response.ok) {
          const error = new Error(data.error || 'Erreur lors de l\'enregistrement de la séance') as Error & { details?: unknown };
          if (data.details) {
            error.details = data.details;
          }
          throw error;
        }

        resultSession = data;
        handleSuccess('Séance enregistrée', `Votre sortie ${type}${dist} a été enregistrée !`);
      } else if (mode === 'edit' && session) {
        resultSession = await updateSession(session.id, sessionData);
        handleSuccess('Séance modifiée', `Votre séance ${type}${dist} a été mise à jour avec succès.`);
      } else {
        resultSession = await addSession(sessionData);
        handleSuccess('Séance ajoutée', `Votre sortie ${type}${dist} a été enregistrée !`);
      }

      if (onSuccess) onSuccess(resultSession);
      onClose();
      form.reset();
    } catch (error) {
      handleFormError(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    form.reset({
      date: getTodayISO(),
      sessionType: 'Footing',
      duration: '',
      distance: null,
      avgPace: '',
      avgHeartRate: null,
      perceivedExertion: null,
      comments: '',
    });
    setIsCustomSessionType(false);
  };

  return {
    form,
    loading,
    isCustomSessionType,
    setIsCustomSessionType,
    intervalEntryMode,
    setIntervalEntryMode,
    onSubmit,
    onUpdate,
    resetForm,
  };
}
