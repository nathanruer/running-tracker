'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { Watch } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { addSession, updateSession, type TrainingSessionPayload, type TrainingSession } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  sessionType: z.string().min(1, 'Type de séance requis'),
  duration: z.string().regex(/^\d{1,2}:\d{2}:\d{2}$/, 'Format: HH:MM:SS'),
  distance: z.number().min(0, 'Distance requise'),
  avgPace: z.string().regex(/^\d{1,2}:\d{2}$/, 'Format: MM:SS'),
  avgHeartRate: z.number().min(0, 'FC requise'),
  comments: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  session?: TrainingSession | null;
  initialData?: Partial<FormValues> | null;
  onRequestStravaImport?: () => void;
}

const SessionDialog = ({
  open,
  onOpenChange,
  onClose,
  session,
  initialData,
  onRequestStravaImport,
}: SessionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      sessionType: '',
      duration: '00:00:00',
      distance: 0,
      avgPace: '00:00',
      avgHeartRate: 0,
      comments: '',
    },
  });

  useEffect(() => {
    if (session) {
      form.reset({
        date: session.date,
        sessionType: session.sessionType,
        duration: session.duration,
        distance: session.distance,
        avgPace: session.avgPace,
        avgHeartRate: session.avgHeartRate,
        comments: session.comments,
      });
    } else if (initialData) {
      const { sessionType, ...importedFields } = initialData;
      form.reset({
        date: new Date().toISOString().split('T')[0],
        sessionType: '',
        duration: '00:00:00',
        distance: 0,
        avgPace: '00:00',
        avgHeartRate: 0,
        comments: '',
        ...importedFields,
      });
    } else {
      form.reset({
        date: new Date().toISOString().split('T')[0],
        sessionType: '',
        duration: '00:00:00',
        distance: 0,
        avgPace: '00:00',
        avgHeartRate: 0,
        comments: '',
      });
    }
  }, [session, initialData, form]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const sessionData: TrainingSessionPayload = {
        date: values.date,
        sessionType: values.sessionType,
        duration: values.duration,
        distance: values.distance,
        avgPace: values.avgPace,
        avgHeartRate: values.avgHeartRate,
        comments: values.comments,
      };

      if (session) {
        await updateSession(session.id, sessionData);
        toast({
          title: 'Séance modifiée',
          description: 'La séance a été mise à jour avec succès.',
        });
      } else {
        await addSession(sessionData);
        toast({
          title: 'Séance ajoutée',
          description: 'La séance a été enregistrée avec succès.',
        });
      }
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
            {session ? 'Modifier la séance' : 'Nouvelle séance'}
          </DialogTitle>
          <DialogDescription>
            {session ? 'Modifiez les informations de votre séance' : 'Enregistrez votre séance d\'entraînement'}
          </DialogDescription>
        </DialogHeader>
        {onRequestStravaImport && (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Importer une course depuis Strava</p>
                <p className="text-sm text-muted-foreground">
                  Se connecter à Strava pour pré-remplir automatiquement cette séance.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="gradient-orange"
                onClick={onRequestStravaImport}
              >
                <Watch className="mr-2 h-4 w-4" />
                Importer Strava
              </Button>
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
                      date={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        field.onChange(date ? date.toISOString().split('T')[0] : '');
                      }}
                      placeholder="Sélectionner une date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de séance</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Footing, Sortie longue, Fractionné..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      <Input type="number" step="0.01" {...field} />
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
                    <FormLabel>Allure (min/km)</FormLabel>
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
                    <FormLabel>FC moyenne (bpm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
              <Button type="submit" className="flex-1 gradient-violet" disabled={loading}>
                {loading ? 'Enregistrement...' : (session ? 'Modifier' : 'Enregistrer')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDialog;
