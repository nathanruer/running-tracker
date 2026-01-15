'use client';

import { Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { TrainingSession } from '@/lib/types';
import { IntervalFields } from '@/features/sessions/components/intervals/interval-fields';
import { type FormValues, type IntervalFormValues } from '@/lib/validation/session-form';
import { SessionTypeSelector } from './session-type-selector';
import { PerceivedExertionField } from './perceived-exertion-field';
import { FileImportButtons } from './file-import-buttons';
import { SessionFormFields } from './session-form-fields';
import { SessionDialogActions } from './session-dialog-actions';
import { SessionDialogHeader } from './session-dialog-header';
import { useSessionForm } from '../../hooks/forms/use-session-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import { useToast } from '@/hooks/use-toast';
import { parseGarminCSV } from '@/features/import/utils/garmin-csv';

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
  onSuccess,
}: SessionDialogProps) => {
  const { toast } = useToast();
  const {
    form,
    loading,
    isCustomSessionType,
    setIsCustomSessionType,
    setIntervalEntryMode,
    onSubmit,
    onUpdate,
    resetForm,
  } = useSessionForm({
    mode,
    session,
    initialData,
    onSuccess,
    onClose,
  });

  const watchedSessionType = form.watch('sessionType');

  useScrollToError(form.formState.errors, form.formState.submitCount);

  const handleCsvImport = (content: string) => {
    try {
      const intervalDetails = parseGarminCSV(content);

      if (!intervalDetails) {
        toast({
          title: 'Format invalide',
          description: 'Impossible de lire le fichier CSV Garmin. Vérifiez le format.',
          variant: 'destructive',
        });
        return;
      }

      form.setValue('sessionType', 'Fractionné');
      form.setValue('steps', intervalDetails.steps);
      form.setValue('workoutType', intervalDetails.workoutType || undefined);
      form.setValue('repetitionCount', intervalDetails.repetitionCount);
      form.setValue('effortDuration', intervalDetails.effortDuration || undefined);
      form.setValue('recoveryDuration', intervalDetails.recoveryDuration || undefined);
      form.setValue('effortDistance', intervalDetails.effortDistance);
      form.setValue('recoveryDistance', intervalDetails.recoveryDistance);
      if (intervalDetails.targetEffortPace) {
        form.setValue('targetEffortPace', intervalDetails.targetEffortPace);
      }
      if (intervalDetails.targetEffortHR) {
        form.setValue('targetEffortHR', intervalDetails.targetEffortHR);
      }
      if (intervalDetails.targetRecoveryPace) {
        form.setValue('targetRecoveryPace', intervalDetails.targetRecoveryPace);
      }
      
      setIsCustomSessionType(false);
      
      toast({
        title: 'Import réussi',
        description: `${intervalDetails.steps.length} étapes importées depuis le fichier Garmin.`,
      });
    } catch {
      toast({
        title: 'Erreur d\'import',
        description: 'Une erreur est survenue lors de l\'analyse du fichier.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="sm:max-w-[640px] rounded-xl border border-border/50 shadow-2xl p-0 overflow-hidden bg-card/95 backdrop-blur-xl">
        <div className="max-h-[95vh] overflow-y-auto p-8 space-y-8">
          <SessionDialogHeader mode={mode} onReset={resetForm} />
          <FileImportButtons
            mode={mode}
            onStravaClick={onRequestStravaImport}
          />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Date de la séance</FormLabel>
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
            {watchedSessionType === 'Fractionné' && (
              <IntervalFields
                control={createIntervalControl(form.control)}
                onEntryModeChange={setIntervalEntryMode}
                setValue={createIntervalSetValue(form.setValue)}
                watch={createIntervalWatch(form.watch)}
                disableAutoRegeneration={mode === 'edit' && session?.status === 'completed'}
                onCsvImport={handleCsvImport}
              />
            )}
            <SessionFormFields control={form.control} />
            <SessionDialogActions
              mode={mode}
              loading={loading}
              hasSession={!!session}
              onCancel={() => {
                onOpenChange(false);
                resetForm();
              }}
              onUpdate={mode === 'complete' ? form.handleSubmit(onUpdate) : undefined}
            />
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDialog;
