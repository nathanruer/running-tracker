'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { Watch, RotateCcw, FileSpreadsheet } from 'lucide-react';
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
import { type TrainingSessionPayload, type TrainingSession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  date: z.string(),
  sessionType: z.string().min(1, 'Type de séance requis'),
  duration: z.string().regex(/^\d{1,2}:\d{2}:\d{2}$/, 'Format: HH:MM:SS'),
  distance: z.number().min(0, 'Distance requise'),
  avgPace: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format: MM:SS'),
  avgHeartRate: z.number().min(0, 'FC requise'),
  intervalStructure: z.string().optional(),
  perceivedExertion: z.number().min(0).max(10).optional(),
  comments: z.string(),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      sessionType: '',
      duration: '00:00:00',
      distance: 0,
      avgPace: '00:00',
      avgHeartRate: 0,
      intervalStructure: '',
      perceivedExertion: 0,
      comments: '',
    },
  });

  useEffect(() => {
    const predefinedTypes = ['Footing', 'Sortie longue', 'Fractionné', 'Autre'];

    if (session && mode === 'complete' && initialData) {
      const { sessionType: importedType, date, comments: importedComments, perceivedExertion: importedRPE, ...importedFields } = initialData;
      const sessionDate = date ? (date.includes('T') ? date.split('T')[0] : date) :
                          (session.date ? session.date.split('T')[0] : new Date().toISOString().split('T')[0]);

      const perceivedExertion = session.targetRPE || 0;

      form.reset({
        date: sessionDate,
        sessionType: session.sessionType,
        intervalStructure: session.intervalStructure || '',
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
        intervalStructure: session.intervalStructure || '',
        perceivedExertion,
        comments: session.comments || '',
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
        intervalStructure: '',
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
        intervalStructure: '',
        perceivedExertion: 0,
        comments: '',
      });
      setIsCustomSessionType(false);
    }
  }, [session, initialData, mode, form]);

  const onUpdate = async (values: FormValues) => {
    if (!session) return;

    setLoading(true);
    try {
      const sessionData: TrainingSessionPayload = {
        date: values.date,
        sessionType: values.sessionType,
        duration: values.duration,
        distance: values.distance,
        avgPace: values.avgPace,
        avgHeartRate: values.avgHeartRate,
        intervalStructure: values.sessionType === 'Fractionné' ? values.intervalStructure : '',
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
      const sessionData: TrainingSessionPayload = {
        date: values.date,
        sessionType: values.sessionType,
        duration: values.duration,
        distance: values.distance,
        avgPace: values.avgPace,
        avgHeartRate: values.avgHeartRate,
        intervalStructure: values.sessionType === 'Fractionné' ? values.intervalStructure : '',
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
                  intervalStructure: '',
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
                    Fichier CSV
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            if (value !== 'Fractionné') {
                              form.setValue('intervalStructure', '');
                            }
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
                          <SelectItem value="Autre">Autre</SelectItem>
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
              <FormField
                control={form.control}
                name="intervalStructure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Structure du fractionné</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 8x1'/1', TEMPO: 3x4'/2', 10x400m/1'30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || value === '-') {
                            field.onChange(value);
                          } else {
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              // Arrondir à 2 décimales
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
                    <FormLabel>
                      {form.watch('sessionType') === 'Fractionné'
                        ? 'Allure cible (min/km)'
                        : 'Allure moyenne (min/km)'}
                    </FormLabel>
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
                    <FormLabel>
                      {form.watch('sessionType') === 'Fractionné'
                        ? 'FC cible (bpm)'
                        : 'FC moyenne (bpm)'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? 0 : parseInt(value));
                        }}
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
