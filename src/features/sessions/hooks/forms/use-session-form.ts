import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { addSession, updateSession } from '@/lib/services/api-client';
import type {
  TrainingSessionPayload,
  TrainingSession,
  CompletedSessionUpdatePayload,
  PlannedSessionPayload,
} from '@/lib/types';
import { formSchema, type FormValues } from '@/lib/validation/session-form';
import { PREDEFINED_TYPES } from '@/features/sessions/components/forms/session-type-selector';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import { transformIntervalData } from '@/lib/utils/intervals';
import { getTodayISO } from '@/lib/utils/formatters';
import { calculatePaceFromDurationAndDistance } from '@/lib/utils/duration';
import {
  normalizeFormValues,
  buildPlannedSessionPayload,
  buildCompletedSessionPayload,
} from '@/lib/domain/forms/session-helpers';
import {
  initializeFormForCreate,
  initializeFormForEdit,
  initializeFormForComplete,
} from '@/lib/domain/forms/session-form';

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
    let defaultValues: Partial<FormValues>;

    if (session && mode === 'complete' && initialData) {
      defaultValues = initializeFormForComplete(session, initialData);
      form.reset(defaultValues);
      setIsCustomSessionType(!predefinedTypes.includes(session.sessionType) && session.sessionType !== '');

      const hasDetailedSteps = (initialData.steps && initialData.steps.length > 0) ||
                               (session.intervalDetails?.steps && session.intervalDetails.steps.length > 0);
      if (hasDetailedSteps) {
        setIntervalEntryMode('detailed');
      }
    } else if (session && (mode === 'edit' || mode === 'complete')) {
      defaultValues = initializeFormForEdit(session);
      form.reset(defaultValues);
      setIsCustomSessionType(!predefinedTypes.includes(session.sessionType) && session.sessionType !== '');

      if (session.intervalDetails?.steps && session.intervalDetails.steps.length > 0) {
        setIntervalEntryMode('detailed');
      }
    } else if (initialData || !session) {
      defaultValues = initializeFormForCreate(initialData);
      form.reset(defaultValues);
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
      const normalizedValues = normalizeFormValues(values);
      const intervalDetails = transformIntervalData(normalizedValues, intervalEntryMode);
      const isPlanned = session.status === 'planned';

      const sessionData: CompletedSessionUpdatePayload | PlannedSessionPayload = isPlanned
        ? buildPlannedSessionPayload(values, normalizedValues, intervalDetails, session.recommendationId)
        : buildCompletedSessionPayload(values, normalizedValues, intervalDetails);

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
    setLoading(true);
    try {
      const normalizedValues = normalizeFormValues(values);
      const intervalDetails = transformIntervalData(normalizedValues, intervalEntryMode);

      const type = values.sessionType.toLowerCase();
      const dist = values.distance ? ` de ${values.distance}km` : '';
      let resultSession: TrainingSession;

      if (mode === 'complete' && session) {
        // Complete a planned session
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
          averageCadence: values.averageCadence,
          averageTemp: values.averageTemp,
          calories: values.calories,
        };

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
        // Edit existing session (planned or completed)
        const isPlanned = session.status === 'planned';
        const editData: CompletedSessionUpdatePayload | PlannedSessionPayload = isPlanned
          ? buildPlannedSessionPayload(values, normalizedValues, intervalDetails, session.recommendationId)
          : buildCompletedSessionPayload(values, normalizedValues, intervalDetails);

        resultSession = await updateSession(session.id, editData);
        handleSuccess('Séance modifiée', `Votre séance ${type}${dist} a été mise à jour avec succès.`);
      } else {
        // Create new session
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
          averageCadence: values.averageCadence,
          averageTemp: values.averageTemp,
          calories: values.calories,
        };

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
