'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState, useRef } from 'react';
import { Watch, RotateCcw, FileSpreadsheet, FileText } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { addSession, updateSession } from '@/lib/services/api-client';
import { type TrainingSessionPayload, type TrainingSession, type IntervalDetails } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { IntervalFields } from './interval-fields';
import { parseTCXFile, tcxActivityToFormData, detectIntervalStructure } from '@/lib/parsers/interval-tcx-parser';
import { parseIntervalCSV } from '@/lib/parsers/interval-csv-parser';

const formSchema = z.object({
  date: z.string(),
  sessionType: z.string().min(1, 'Type de séance requis'),
  duration: z.string().regex(/^\d{1,2}:\d{2}:\d{2}$/, 'Format: HH:MM:SS'),
  distance: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  avgPace: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format: MM:SS'),
  avgHeartRate: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  perceivedExertion: z.number().min(0).max(10).nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  comments: z.string(),
  workoutType: z.string().optional(),
  repetitionCount: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  effortDuration: z.string().optional(),
  recoveryDuration: z.string().optional(),
  effortDistance: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  recoveryDistance: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  targetEffortPace: z.string().optional(),
  targetEffortHR: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  targetRecoveryPace: z.string().optional(),
  actualEffortPace: z.string().optional(),
  actualEffortHR: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  actualRecoveryPace: z.string().optional(),
  steps: z.array(z.object({
    stepNumber: z.number(),
    stepType: z.enum(['warmup', 'effort', 'recovery', 'cooldown']),
    duration: z.string().optional(),
    distance: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
    pace: z.string().optional(),
    hr: z.number().nullable().optional().refine((n) => n === null || n === undefined || (typeof n === 'number' && !isNaN(n)), { message: 'Nombre requis' }),
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isCustomSessionType, setIsCustomSessionType] = useState(false);
  const [intervalEntryMode, setIntervalEntryMode] = useState<'quick' | 'detailed'>('quick');
  const tcxFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

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
      actualEffortPace: '',
      actualEffortHR: undefined,
      actualRecoveryPace: '',
      steps: [],
    },
  });

  useEffect(() => {
    const predefinedTypes = ['Footing', 'Sortie longue', 'Fractionné'];

    if (session && mode === 'complete' && initialData) {
      const { sessionType: importedType, date, comments: importedComments, perceivedExertion: importedRPE, ...importedFields } = initialData;
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
        actualEffortPace: session.intervalDetails?.actualEffortPace || '',
        actualEffortHR: session.intervalDetails?.actualEffortHR || undefined,
        actualRecoveryPace: session.intervalDetails?.actualRecoveryPace || '',
        steps: session.intervalDetails?.steps?.map(s => ({
          stepNumber: s.stepNumber,
          stepType: s.stepType,
          duration: s.duration || undefined,
          distance: s.distance || undefined,
          pace: s.pace || undefined,
          hr: s.hr || undefined,
        })) || [],
      });
      setIsCustomSessionType(!predefinedTypes.includes(session.sessionType) && session.sessionType !== '');
    } else if (initialData) {
      const { sessionType, date, ...importedFields } = initialData;
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
        toast({
          title: 'Erreur',
          description: 'Impossible de lire le fichier TCX',
          variant: 'destructive',
        });
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
          duration: step.duration || undefined,
          distance: step.distance || undefined,
          pace: step.pace || undefined,
          hr: step.hr ?? undefined,
        })));

        form.setValue('repetitionCount', intervalStructure.repetitionCount || undefined);
        form.setValue('effortDuration', intervalStructure.effortDuration || '');
        form.setValue('recoveryDuration', intervalStructure.recoveryDuration || '');
        form.setValue('effortDistance', intervalStructure.effortDistance || undefined);
        form.setValue('recoveryDistance', undefined);

        if (intervalStructure.actualEffortPace) {
          form.setValue('actualEffortPace', intervalStructure.actualEffortPace);
        }
        if (intervalStructure.actualEffortHR) {
          form.setValue('actualEffortHR', intervalStructure.actualEffortHR);
        }
        if (intervalStructure.actualRecoveryPace) {
          form.setValue('actualRecoveryPace', intervalStructure.actualRecoveryPace);
        }

        setIntervalEntryMode('detailed');

        toast({
          title: 'Fractionné détecté',
          description: `${intervalStructure.repetitionCount} répétitions détectées. Les étapes ont été pré-remplies en mode détaillé.`,
        });
      } else {
        toast({
          title: 'Séance importée',
          description: 'Les données de base ont été importées depuis le fichier TCX.',
        });
      }

      if (tcxFileInputRef.current) {
        tcxFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing TCX:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'import du fichier TCX',
        variant: 'destructive',
      });
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = parseIntervalCSV(text);

      if (!result) {
        toast({
          title: 'Erreur',
          description: 'Impossible de lire le fichier CSV',
          variant: 'destructive',
        });
        return;
      }

      form.setValue('sessionType', 'Fractionné');

      form.setValue('steps', result.steps.map(step => ({
        ...step,
        duration: step.duration || undefined,
        distance: step.distance || undefined,
        pace: step.pace || undefined,
        hr: step.hr ?? undefined,
      })));

      form.setValue('repetitionCount', result.repetitionCount || undefined);

      setIntervalEntryMode('detailed');

      toast({
        title: 'Intervalles importés',
        description: `${result.repetitionCount} répétitions détectées depuis le CSV.`,
      });

      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'import du fichier CSV',
        variant: 'destructive',
      });
    }
  };

  const transformIntervalData = (values: FormValues): IntervalDetails | null => {
    if (values.sessionType !== 'Fractionné') return null;

    const hasIntervalData =
      values.workoutType ||
      values.repetitionCount ||
      values.targetEffortPace ||
      values.targetEffortHR ||
      values.actualEffortPace ||
      values.targetEffortHR ||
      values.actualEffortPace ||
      values.actualEffortHR ||
      values.targetRecoveryPace ||
      values.actualRecoveryPace ||
      values.recoveryDistance;

    if (!hasIntervalData) return null;

    return {
      workoutType: values.workoutType || null,
      repetitionCount: values.repetitionCount ?? null,
      effortDuration: values.effortDuration || null,
      recoveryDuration: values.recoveryDuration || null,
      effortDistance: values.effortDistance ?? null,
      recoveryDistance: values.recoveryDistance ?? null,
      targetEffortPace: values.targetEffortPace || null,
      targetEffortHR: values.targetEffortHR ?? null,
      targetRecoveryPace: values.targetRecoveryPace || null,
      actualEffortPace: values.actualEffortPace || null,
      actualEffortHR: values.actualEffortHR ?? null,
      actualRecoveryPace: values.actualRecoveryPace || null,
      steps:
        intervalEntryMode === 'detailed' && values.steps
          ? values.steps.map((step) => ({
              stepNumber: step.stepNumber,
              stepType: step.stepType,
              duration: step.duration || null,
              distance: step.distance || null,
              pace: step.pace || null,
              hr: step.hr || null,
            }))
          : [],
    };
  };

  const onUpdate = async (values: FormValues) => {
    if (!session) return;

    setLoading(true);
    try {
      const intervalDetails = transformIntervalData(values);
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
      
      toast({
        title: 'Séance modifiée',
        description: 'La séance a été mise à jour avec succès.',
      });
      if (onSuccess) onSuccess(updatedSession);
      onClose();
      form.reset();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la modification.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!values.date) {
      toast({
        title: 'Erreur',
        description: 'La date est requise pour marquer une séance comme réalisée',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const intervalDetails = transformIntervalData(values);
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
        
        toast({
          title: 'Séance enregistrée',
          description: 'La séance a été enregistrée avec succès.',
        });
      } else if (mode === 'edit' && session) {
        resultSession = await updateSession(session.id, sessionData);
        toast({
          title: 'Séance modifiée',
          description: 'La séance a été mise à jour avec succès.',
        });
      } else {
        resultSession = await addSession(sessionData);
        toast({
          title: 'Séance ajoutée',
          description: 'La séance a été enregistrée avec succès.',
        });
      }
      
      if (onSuccess) onSuccess(resultSession);
      onClose();
      form.reset();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'enregistrement.',
        variant: 'destructive',
      });
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
        {(mode === 'create' || mode === 'complete') && (onRequestStravaImport || onRequestCsvImport) && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4">
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-medium">Importer une séance</p>
                <p className="text-sm text-muted-foreground">
                  Pré-remplissez votre séance automatiquement depuis une source externe.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {onRequestStravaImport && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="gradient-orange"
                    onClick={onRequestStravaImport}
                  >
                    <Watch className="mr-2 h-4 w-4" />
                    Strava
                  </Button>
                )}
                {onRequestCsvImport && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onRequestCsvImport}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Fichier CSV/JSON
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        <input
          ref={tcxFileInputRef}
          type="file"
          accept=".tcx"
          className="hidden"
          onChange={handleTCXImport}
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
                  <FormItem className="flex-1">
                    <FormLabel>Type de séance</FormLabel>
                    {!isCustomSessionType ? (
                      <Select
                        onValueChange={(value) => {
                          if (value === 'custom') {
                            setIsCustomSessionType(true);
                            field.onChange('');
                          } else {
                            field.onChange(value);
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Footing">Footing</SelectItem>
                          <SelectItem value="Sortie longue">Sortie longue</SelectItem>
                          <SelectItem value="Fractionné">Fractionné</SelectItem>
                          <SelectItem value="custom">Personnalisé...</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="Type personnalisé"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCustomSessionType(false);
                            field.onChange('');
                          }}
                          className="h-10 px-3"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="perceivedExertion"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>RPE (1-10)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Note" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Non spécifié</SelectItem>
                        <SelectItem value="1">1 - Très facile</SelectItem>
                        <SelectItem value="2">2 - Facile</SelectItem>
                        <SelectItem value="3">3 - Modéré</SelectItem>
                        <SelectItem value="4">4 - Un peu difficile</SelectItem>
                        <SelectItem value="5">5 - Difficile</SelectItem>
                        <SelectItem value="6">6 - Très difficile</SelectItem>
                        <SelectItem value="7">7 - Extrêmement difficile</SelectItem>
                        <SelectItem value="8">8 - Épuisant</SelectItem>
                        <SelectItem value="9">9 - Presque maximal</SelectItem>
                        <SelectItem value="10">10 - Maximal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.watch('sessionType') === 'Fractionné' && (
              <>
                <div className="flex items-center justify-between rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Importer les intervalles
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => tcxFileInputRef.current?.click()}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      TCX
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => csvFileInputRef.current?.click()}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
                <IntervalFields
                  control={form.control}
                  entryMode={intervalEntryMode}
                  onEntryModeChange={setIntervalEntryMode}
                  setValue={form.setValue}
                  watch={form.watch}
                />
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (HH:MM:SS)</FormLabel>
                    <FormControl>
                      <Input placeholder="01:30:00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="10.5"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            field.onChange(null);
                          } else if (value === '-') {
                            field.onChange(value);
                          } else {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              const rounded = Math.round(numValue * 100) / 100;
                              field.onChange(rounded);
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="avgPace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allure moy (min/km)</FormLabel>
                    <FormControl>
                      <Input placeholder="05:30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avgHeartRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FC moy (bpm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="145"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaires</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Comment s'est passée votre séance ?"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                className="flex-1"
              >
                Annuler
              </Button>
              {mode === 'complete' ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={form.handleSubmit(onUpdate)}
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Modification...' : 'Modifier'}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gradient-violet"
                    disabled={loading}
                  >
                    {loading ? 'Enregistrement...' : 'Modifier et marquer comme réalisé'}
                  </Button>
                </>
              ) : (
                <Button type="submit" className="flex-1 gradient-violet" disabled={loading}>
                  {loading ? 'Enregistrement...' : (session ? 'Modifier' : 'Enregistrer')}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDialog;
