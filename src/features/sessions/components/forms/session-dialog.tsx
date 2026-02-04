import { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar } from 'lucide-react';
import type { TrainingSession } from '@/lib/types';
import { IntervalFields } from '@/features/sessions/components/intervals/interval-fields';
import { type FormValues, type IntervalFormValues } from '@/lib/validation/session-form';
import { SessionTypeSelector } from './session-type-selector';
import { PerceivedExertionField } from './perceived-exertion-field';
import { FileImportButtons } from './file-import-buttons';
import { SessionFormFields } from './session-form-fields';
import { SessionDialogActions } from './session-dialog-actions';
import { SessionDialogHeader } from './session-dialog-header';
import { ErrorMessage } from '@/components/ui/error-message';
import { useSessionForm } from '../../hooks/forms/use-session-form';
import { useScrollToError } from '@/hooks/use-scroll-to-error';
import { useToast } from '@/hooks/use-toast';
import { parseGarminCSV } from '@/features/import/utils/garmin-csv';
import { formatDate } from '@/lib/utils/date';

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
  const [completeStep, setCompleteStep] = useState<'done' | 'planned'>('done');

  const {
    form,
    loading,
    isCustomSessionType,
    setIsCustomSessionType,
    setIntervalEntryMode,
    onSubmit,
    onUpdate,
    resetForm,
    error,
  } = useSessionForm({
    mode,
    session,
    initialData,
    onSuccess,
    onClose,
  });

  const watchedSessionType = form.watch('sessionType');

  const isStravaImport = useMemo(() => {
    return initialData?.source === 'strava' || initialData?.externalId;
  }, [initialData]);

  useEffect(() => {
    if (mode === 'complete') {
      form.setValue('isCompletion', completeStep === 'done', { shouldValidate: form.formState.submitCount > 0 });
      form.clearErrors();
    }
  }, [completeStep, mode, form]);

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
      if (intervalDetails.workoutType) {
        form.setValue('workoutType', intervalDetails.workoutType);
      }
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

  const handleModeAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'complete' && completeStep === 'planned') {
      form.handleSubmit(onUpdate)(e);
    } else {
      form.handleSubmit(onSubmit)(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-testid="session-dialog"
        hideClose 
        className="sm:max-w-[640px] p-0 overflow-hidden w-[95vw] md:w-full"
      >
        <div className="max-h-[90vh] md:max-h-[85vh] overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">
          <SessionDialogHeader mode={mode} onReset={resetForm} />
          <ErrorMessage error={error} className="mb-2" />

          {mode === 'complete' && (
            <Tabs 
              defaultValue="done" 
              value={completeStep} 
              onValueChange={(v) => setCompleteStep(v as 'done' | 'planned')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-muted/30 p-1.5 border border-border/40 font-bold text-xs">
                <TabsTrigger 
                  value="done" 
                  className="rounded-xl data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Séance effectuée
                </TabsTrigger>
                <TabsTrigger 
                  value="planned" 
                  className="rounded-xl data-[state=active]:bg-muted/50 data-[state=active]:text-foreground transition-all gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Modifier le plan
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {((mode === 'complete' && completeStep === 'done') || mode === 'create') && !isStravaImport && (
            <FileImportButtons
              mode={mode}
              onStravaClick={onRequestStravaImport}
            />
          )}

          {isStravaImport && (mode === 'complete' || mode === 'create') && (
            <div className="flex flex-col gap-5 p-5 rounded-2xl bg-muted/20 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/10">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FC4C02] p-2 rounded-xl shadow-lg shadow-orange-500/10">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" fill="white" />
                      <path d="M10.233 13.828L7.9 9.111H4.47l5.763 11.38 2.089-4.116-2.089-2.547z" fill="white" opacity="0.6" />
                      <path d="M7.9 9.111l2.333 4.717 2.089 2.547 2.089-4.116h3.065L12 0 7.9 9.111z" fill="white" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-wider text-foreground/90">Synchronisation Strava</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-emerald-500 font-bold">Activité importée</span>
                      {(initialData?.externalId || session?.externalId) && (
                        <a
                          href={`https://www.strava.com/activities/${initialData?.externalId || session?.externalId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-orange-500 px-1 hover:bg-orange-500/10 rounded transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onRequestStravaImport}
                  className="h-8 px-3 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all border border-border/20"
                >
                  Modifier
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/50">Date</span>
                  <span className="text-lg font-black tracking-tight text-foreground/90 whitespace-nowrap">
                    {form.watch('date') ? formatDate(form.watch('date') as string, 'short').split('/').join(' . ') : '--'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/50">Distance</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black tabular-nums tracking-tight">
                      {form.watch('distance') || '--'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 font-bold">KM</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/50">Temps</span>
                  <span className="text-lg font-black tabular-nums tracking-tight">
                    {form.watch('duration') || '--'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/50">Allure</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black tabular-nums tracking-tight">
                      {form.watch('avgPace') || '--'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 font-bold">/KM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        <Form {...form}>
          <form onSubmit={handleModeAndSubmit} className="space-y-4" noValidate>
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
                          field.onChange(null);
                        }
                      }}
                      placeholder={mode === 'complete' ? "À planifier" : "Sélectionner une date"}
                      allowClear={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
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
              <div className="flex-1 transition-all duration-300">
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
              primaryLabel={mode === 'complete' && completeStep === 'planned' ? (loading ? 'Mise à jour...' : 'Mettre à jour le plan') : undefined}
            />
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDialog;
