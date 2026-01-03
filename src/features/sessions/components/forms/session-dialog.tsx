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
import { IntervalImportSection } from './interval-import-section';
import { FileImportButtons } from './file-import-buttons';
import { SessionFormFields } from './session-form-fields';
import { SessionDialogActions } from './session-dialog-actions';
import { SessionDialogHeader } from './session-dialog-header';
import { useFileImport } from '../../hooks/forms/use-file-import';
import { useSessionForm } from '../../hooks/forms/use-session-form';

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

  const { csvFileInputRef, triggerCsvSelect, handleCSVImport } = useFileImport({
    onValuesChange: form.setValue,
    onIntervalModeChange: setIntervalEntryMode,
  });

  const watchedSessionType = form.watch('sessionType');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <SessionDialogHeader mode={mode} onReset={resetForm} />
        <FileImportButtons
          mode={mode}
          onStravaClick={onRequestStravaImport}
          onCsvClick={onRequestCsvImport}
        />
        <input
          ref={csvFileInputRef}
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
            {watchedSessionType === 'Fractionné' && (
              <>
                <IntervalImportSection
                  onCsvClick={triggerCsvSelect}
                />
                <IntervalFields
                  control={createIntervalControl(form.control)}
                  onEntryModeChange={setIntervalEntryMode}
                  setValue={createIntervalSetValue(form.setValue)}
                  watch={createIntervalWatch(form.watch)}
                  disableAutoRegeneration={mode === 'edit' && session?.status === 'completed'}
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
                resetForm();
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
