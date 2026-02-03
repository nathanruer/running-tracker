import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage } from '@/components/ui/error-message';
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/lib/services/api-client';
import { type User } from '@/lib/types';
import { queryKeys } from '@/lib/constants/query-keys';

const profileSchema = z.object({
  email: z.string().email('Email invalide'),
  weight: z.union([z.string(), z.number()]).optional(),
  age: z.union([z.string(), z.number()]).optional(),
  maxHeartRate: z.union([z.string(), z.number()]).optional(),
  vma: z.union([z.string(), z.number()]).optional(),
  goal: z.string().optional(),
}).refine((data) => {
  if (data.weight !== undefined && typeof data.weight === 'string' && data.weight !== '') {
    const num = parseFloat(data.weight);
    if (isNaN(num) || num <= 0) return false;
  }
  if (data.age !== undefined && typeof data.age === 'string' && data.age !== '') {
    const num = parseFloat(data.age);
    if (isNaN(num) || num <= 0) return false;
  }
  if (data.maxHeartRate !== undefined && typeof data.maxHeartRate === 'string' && data.maxHeartRate !== '') {
    const num = parseFloat(data.maxHeartRate);
    if (isNaN(num) || num <= 0) return false;
  }
  if (data.vma !== undefined && typeof data.vma === 'string' && data.vma !== '') {
    const num = parseFloat(data.vma);
    if (isNaN(num) || num <= 0) return false;
  }
  return true;
}, { message: 'Valeur invalide' });

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user.email,
      weight: user.weight ?? undefined,
      age: user.age ?? undefined,
      maxHeartRate: user.maxHeartRate ?? undefined,
      vma: user.vma ?? undefined,
      goal: user.goal ?? undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.user(), updatedUser);
      toast({
        title: 'Succès',
        description: 'Vos informations personnelles ont été mises à jour.',
      });
      reset({
        email: updatedUser.email,
        weight: updatedUser.weight ?? undefined,
        age: updatedUser.age ?? undefined,
        maxHeartRate: updatedUser.maxHeartRate ?? undefined,
        vma: updatedUser.vma ?? undefined,
        goal: updatedUser.goal ?? undefined,
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le profil.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    mutation.mutate({
      weight: typeof data.weight === 'string' ? parseFloat(data.weight) : data.weight ?? undefined,
      age: typeof data.age === 'string' ? parseFloat(data.age) : data.age ?? undefined,
      maxHeartRate: typeof data.maxHeartRate === 'string' ? parseFloat(data.maxHeartRate) : data.maxHeartRate ?? undefined,
      vma: typeof data.vma === 'string' ? parseFloat(data.vma) : data.vma ?? undefined,
      goal: data.goal ?? undefined,
    });
  };

  return (
    <Card className="md:col-span-1 border-border/50 shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-xl font-bold">Informations personnelles</CardTitle>
        <CardDescription> 
          Mettez à jour vos informations pour calculer vos zones d&apos;entraînement.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Email</Label>
            <Input 
              id="email" 
              {...register('email')} 
              className="bg-muted/30 border-border/50 opacity-60 cursor-not-allowed" 
              disabled 
            />
            <p className="text-[10px] text-muted-foreground/60 ml-1 italic">
              L&apos;adresse email ne peut pas être modifiée.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Objectif / Contexte</Label>
            <Textarea
              id="goal"
              {...register('goal')}
              placeholder="Ex: Je veux courir un 10km en moins de 50 minutes dans 2 mois"
              rows={4}
              className="bg-muted/30 border-border/50 resize-none"
            />
            <ErrorMessage error={errors.goal?.message} variant="inline" className="ml-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Poids (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                {...register('weight')}
                placeholder="70.5"
                className="bg-muted/30 border-border/50"
              />
              <ErrorMessage error={errors.weight?.message} variant="inline" className="ml-1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Âge</Label>
              <Input id="age" type="number" {...register('age')} placeholder="30" className="bg-muted/30 border-border/50" />
              <ErrorMessage error={errors.age?.message} variant="inline" className="ml-1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxHeartRate" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">FC Max (bpm)</Label>
              <Input
                id="maxHeartRate"
                type="number"
                {...register('maxHeartRate')}
                placeholder="185"
                className="bg-muted/30 border-border/50"
              />
              <ErrorMessage error={errors.maxHeartRate?.message} variant="inline" className="ml-1" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vma" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">VMA (km/h)</Label>
              <Input
                id="vma"
                type="number"
                step="0.1"
                {...register('vma')}
                placeholder="16.5"
                className="bg-muted/30 border-border/50"
              />
              <ErrorMessage error={errors.vma?.message} variant="inline" className="ml-1" />
            </div>
          </div>

          <div className='pt-4'>
            <Button type="submit" variant="action" size="xl" className="w-full" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
