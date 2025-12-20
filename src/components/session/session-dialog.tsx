'use client';
import { useForm, Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { addSession, updateSession } from '@/lib/services/api-client';
import type { TrainingSessionPayload, TrainingSession } from '@/lib/types';
import { IntervalFields } from '@/components/intervals/interval-fields';
import { parseTCXFile, tcxActivityToFormData, detectIntervalStructure } from '@/lib/parsers/interval-tcx-parser';
import { parseIntervalCSV } from '@/lib/parsers/interval-csv-parser';
import { formSchema, type FormValues, type IntervalFormValues } from '@/lib/validation/session-form';
import { SessionTypeSelector, PREDEFINED_TYPES } from './session-type-selector';
import { PerceivedExertionField } from './perceived-exertion-field';
import { IntervalImportSection } from './interval-import-section';
import { FileImportButtons } from './file-import-buttons';
import { SessionFormFields } from './session-form-fields';
import { SessionDialogActions } from './session-dialog-actions';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import { useMultipleFileInputs } from '@/hooks/use-file-input';
import { transformIntervalData } from '@/lib/utils/intervals';

// Helper functions to adapt the main form to interval fields
const createIntervalControl = (control: Control<FormValues>): Control<IntervalFormValues> => {
  return control as unknown as Control<IntervalFormValues>;
};
const createIntervalSetValue = (setValue: UseFormSetValue<FormValues>): UseFormSetValue<IntervalFormValues> => {
  return setValue as unknown as UseFormSetValue<IntervalFormValues>;
};
const createIntervalWatch = (watch: UseFormWatch<FormValues>): UseFormWatch<IntervalFormValues> => {
  return watch as unknown as UseFormWatch<IntervalFormValues>;
};


interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  session?: TrainingSession | null;
  initialData?: Partial<FormValues> | null;
  mode?: 'create' | 'edit' | 'complete';
  onRequestStravaImport?: () => void;
  onRequestCsvImport?: () => void;
  onSuccess?: (session: TrainingSession) => void;
}

const SessionDialog = ({
  open,
  onOpenChange,
  onClose,
  session,
  initialData,
  mode = 'create',
  onRequestStravaImport,
  onRequestCsvImport,
  onSuccess,
}: SessionDialogProps) => {
  const { handleError, handleSuccess } = useApiErrorHandler();
  const [loading, setLoading] = useState(false);
  const [isCustomSessionType, setIsCustomSessionType] = useState(false);
  const [intervalEntryMode, setIntervalEntryMode] = useState<'quick' | 'detailed'>('quick');

  const [tcxInput, csvInput] = useMultipleFileInputs(2);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      sessionType: '',
      duration: '00:00:00',
      distance: 0,
      avgPace: '00:00',
      avgHeartRate: 0,
      perceivedExertion: 0,
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
    },
  });

  useEffect(() => {
    const predefinedTypes = PREDEFINED_TYPES;

    if (session && mode === 'complete' && initialData) {
      const { date, ...importedFields } = initialData;
      const sessionDate = date ? (date.includes('T') ? date.split('T')[0] : date) :
                          (session.date ? session.date.split('T')[0] : new Date().toISOString().split('T')[0]);

      const perceivedExertion = session.targetRPE || 0;

      form.reset({
        date: sessionDate,
        sessionType: session.sessionType,
        perceivedExertion,
        comments: session.comments || '',
        duration: '00:00:00',
        distance: 0,
        avgPace: '00:00',
        avgHeartRate: 0,
        ...importedFields,
      });
      setIsCustomSessionType(!predefinedTypes.includes(session.sessionType) && session.sessionType !== '');
    } else if (session && (mode === 'edit' || mode === 'complete')) {
      const sessionDate = session.date ? session.date.split('T')[0] : '';

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
      });
      setIsCustomSessionType(!predefinedTypes.includes(session.sessionType) && session.sessionType !== '');
    } else if (initialData) {
      const { date, ...importedFields } = initialData;
      form.reset({
        date: date ? (date.includes('T') ? date.split('T')[0] : date) : new Date().toISOString().split('T')[0],
        sessionType: '',
        duration: '00:00:00',
        distance: 0,
        avgPace: '00:00',
        avgHeartRate: 0,
          perceivedExertion: 0,
        comments: '',
        ...importedFields,
      });
      setIsCustomSessionType(false);
    } else {
      form.reset({
        date: new Date().toISOString().split('T')[0],
        sessionType: '',
        duration: '00:00:00',
        distance: 0,
        avgPace: '00:00',
        avgHeartRate: 0,
          perceivedExertion: 0,
        comments: '',
      });
      setIsCustomSessionType(false);
    }
  }, [session, initialData, mode, form]);

  const handleTCXImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const activity = parseTCXFile(text);

      if (!activity) {
        handleError(new Error('Impossible de lire le fichier TCX'));
        return;
      }

      const formData = tcxActivityToFormData(activity);
      form.setValue('date', formData.date);
      form.setValue('duration', formData.duration);
      form.setValue('distance', formData.distance);
      form.setValue('avgPace', formData.avgPace);
      form.setValue('avgHeartRate', formData.avgHeartRate);

      const intervalStructure = detectIntervalStructure(activity.laps);

      if (intervalStructure.isInterval) {
        form.setValue('sessionType', 'Fractionné');

        form.setValue('steps', intervalStructure.steps.map(step => ({
          ...step,
          duration: step.duration || null,
          distance: step.distance ?? null,
          pace: step.pace || null,
          hr: step.hr ?? null,
        })));

        form.setValue('repetitionCount', intervalStructure.repetitionCount || undefined);
        form.setValue('effortDuration', intervalStructure.effortDuration || '');
        form.setValue('recoveryDuration', intervalStructure.recoveryDuration || '');
        form.setValue('effortDistance', intervalStructure.effortDistance || undefined);
        form.setValue('recoveryDistance', undefined);

        setIntervalEntryMode('detailed');

        handleSuccess(
          'Fractionné détecté',
          `${intervalStructure.repetitionCount} répétitions détectées. Les étapes ont été pré-remplies en mode détaillé.`
        );
      } else {
        handleSuccess('Séance importée', 'Les données de base ont été importées depuis le fichier TCX.');
      }

      tcxInput.resetFileInput();
    } catch (error) {
      console.error('Error importing TCX:', error);
      handleError(error, 'Une erreur est survenue lors de l\'import du fichier TCX');
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseIntervalCSV(text);

      if (!result) {
        handleError(new Error('Impossible de lire le fichier CSV'));
        return;
      }

      form.setValue('sessionType', 'Fractionné');

      form.setValue('steps', result.steps.map(step => ({
        ...step,
        duration: step.duration || null,
        distance: step.distance ?? null,
        pace: step.pace || null,
        hr: step.hr ?? null,
      })));

      form.setValue('repetitionCount', result.repetitionCount || undefined);

      setIntervalEntryMode('detailed');

      handleSuccess('Intervalles importés', `${result.repetitionCount} répétitions détectées depuis le CSV.`);

      csvInput.resetFileInput();
    } catch (error) {
      console.error('Error importing CSV:', error);
      handleError(error, 'Une erreur est survenue lors de l\'import du fichier CSV');
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-gradient">
            {mode === 'complete' ? 'Enregistrer la séance' : mode === 'edit' ? 'Modifier la séance' : 'Ajouter une séance'}
          </DialogTitle>
          <div className="flex items-center justify-between gap-4">
            <DialogDescription>
              {mode === 'complete' ? 'Remplissez les détails de votre séance réalisée' : mode === 'edit' ? 'Modifiez les informations de votre séance' : 'Enregistrez votre séance d\'entraînement'}
            </DialogDescription>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                form.reset({
                  date: new Date().toISOString().split('T')[0],
                  sessionType: '',
                  duration: '00:00:00',
                  distance: 0,
                  avgPace: '00:00',
                  avgHeartRate: 0,
                              perceivedExertion: 0,
                  comments: '',
                });
                setIsCustomSessionType(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Réinitialiser
            </Button>
          </div>
        </DialogHeader>
        <FileImportButtons
          mode={mode}
          onStravaClick={onRequestStravaImport}
          onCsvClick={onRequestCsvImport}
        />
        <input
          ref={tcxInput.fileInputRef}
          type="file"
          accept=".tcx"
          className="hidden"
          onChange={handleTCXImport}
        />
        <input
          ref={csvInput.fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCSVImport}
        />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          field.onChange(`${year}-${month}-${day}`);
                        } else {
                          field.onChange('');
                        }
                      }}
                      placeholder={mode === 'complete' ? "À planifier" : "Sélectionner une date"}
                      allowClear={mode === 'complete'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="sessionType"
                render={({ field }) => (
                  <SessionTypeSelector
                    value={field.value}
                    onChange={field.onChange}
                    isCustomType={isCustomSessionType}
                    onCustomTypeChange={setIsCustomSessionType}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="perceivedExertion"
                render={({ field }) => (
                  <PerceivedExertionField
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            {form.watch('sessionType') === 'Fractionné' && (
              <>
                <IntervalImportSection
                  onTcxClick={tcxInput.triggerFileSelect}
                  onCsvClick={csvInput.triggerFileSelect}
                />
                <IntervalFields
                  control={createIntervalControl(form.control)}
                  entryMode={intervalEntryMode}
                  onEntryModeChange={setIntervalEntryMode}
                  setValue={createIntervalSetValue(form.setValue)}
                  watch={createIntervalWatch(form.watch)}
                />
              </>
            )}
            <SessionFormFields control={form.control} />
            <SessionDialogActions
              mode={mode}
              loading={loading}
              hasSession={!!session}
              onCancel={() => {
                onOpenChange(false);
                form.reset();
              }}
              onUpdate={mode === 'complete' ? form.handleSubmit(onUpdate) : undefined}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDialog;
