import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { addSession, updateSession } from '@/lib/services/api-client';
import type { TrainingSessionPayload, TrainingSession } from '@/lib/types';
import { formSchema, type FormValues } from '@/lib/validation/session-form';
import { PREDEFINED_TYPES } from '@/features/sessions/components/session-type-selector';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import { transformIntervalData } from '@/lib/utils/intervals';
import { getTodayISO, extractDatePart } from '@/lib/utils/formatters';

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
      sessionType: '',
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

  useEffect(() => {
    const predefinedTypes = PREDEFINED_TYPES;

    if (session && mode === 'complete' && initialData) {
      const { date, ...importedFields } = initialData;
      const sessionDate = date ? extractDatePart(date) :
                          (session.date ? extractDatePart(session.date) : getTodayISO());

      const perceivedExertion = session.targetRPE || 0;

      form.reset({
        date: sessionDate,
        sessionType: session.sessionType,
        perceivedExertion,
        comments: session.comments || '',
        duration: '',
        distance: null,
        avgPace: '',
        avgHeartRate: null,
        ...importedFields,
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
        : session.perceivedExertion || 0;

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
        sessionType: '',
        duration: '',
        distance: null,
        avgPace: '',
        avgHeartRate: null,
        perceivedExertion: null,
        comments: '',
        ...importedFields,
      });
      setIsCustomSessionType(false);
    } else {
      form.reset({
        date: getTodayISO(),
        sessionType: '',
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

  const onUpdate = async (values: FormValues) => {
    if (!session) return;

    setLoading(true);
    try {
      const intervalDetails = transformIntervalData(values, intervalEntryMode);
      const sessionData: TrainingSessionPayload = {
        date: values.date,
        sessionType: values.sessionType,
        duration: values.duration,
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

      handleSuccess('Séance modifiée', 'La séance a été mise à jour avec succès.');
      if (onSuccess) onSuccess(updatedSession);
      onClose();
      form.reset();
    } catch (error) {
      handleError(error, 'Une erreur est survenue lors de la modification.');
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
      const intervalDetails = transformIntervalData(values, intervalEntryMode);
      const sessionData: TrainingSessionPayload = {
        date: values.date,
        sessionType: values.sessionType,
        duration: values.duration,
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

      let resultSession: TrainingSession;

      if (mode === 'complete' && session) {
        const response = await fetch(`/api/sessions/${session.id}/complete`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de l\'enregistrement de la séance');
        }

        resultSession = data;
        handleSuccess('Séance enregistrée', 'La séance a été enregistrée avec succès.');
      } else if (mode === 'edit' && session) {
        resultSession = await updateSession(session.id, sessionData);
        handleSuccess('Séance modifiée', 'La séance a été mise à jour avec succès.');
      } else {
        resultSession = await addSession(sessionData);
        handleSuccess('Séance ajoutée', 'La séance a été enregistrée avec succès.');
      }

      if (onSuccess) onSuccess(resultSession);
      onClose();
      form.reset();
    } catch (error) {
      handleError(error, 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    form.reset({
      date: getTodayISO(),
      sessionType: '',
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
