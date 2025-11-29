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
import { useToast } from '@/hooks/use-toast';
import { updateUser } from '@/lib/services/api-client';
import { type User } from '@/lib/types';

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  })
  .pipe(z.number().positive().optional());

const profileSchema = z.object({
  email: z.string().email('Email invalide'),
  weight: optionalNumber,
  age: optionalNumber,
  maxHeartRate: optionalNumber,
  vma: optionalNumber,
  goal: z.string().optional(),
});

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
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as any,
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
      queryClient.setQueryData(['user'], updatedUser);
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées avec succès.',
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
      email: data.email,
      weight: data.weight ?? undefined,
      age: data.age ?? undefined,
      maxHeartRate: data.maxHeartRate ?? undefined,
      vma: data.vma ?? undefined,
      goal: data.goal ?? undefined,
    });
  };

  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
        <CardDescription> 
          Mettez à jour vos informations pour calculer vos zones d'entraînement.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Objectif / Contexte</Label>
            <Textarea
              id="goal"
              {...register('goal')}
              placeholder="Ex: Je veux courir un 10km en moins de 50 minutes dans 2 mois"
              rows={3}
            />
            {errors.goal && (
              <p className="text-sm text-destructive">{errors.goal.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Poids (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                {...register('weight')}
              />
              {errors.weight && (
                <p className="text-sm text-destructive">{errors.weight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Âge</Label>
              <Input id="age" type="number" {...register('age')} />
              {errors.age && (
                <p className="text-sm text-destructive">{errors.age.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxHeartRate">FC Max (bpm)</Label>
              <Input
                id="maxHeartRate"
                type="number"
                {...register('maxHeartRate')}
              />
              {errors.maxHeartRate && (
                <p className="text-sm text-destructive">
                  {errors.maxHeartRate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vma">VMA (km/h)</Label>
              <Input
                id="vma"
                type="number"
                step="0.1"
                {...register('vma')}
              />
              {errors.vma && (
                <p className="text-sm text-destructive">
                  {errors.vma.message}
                </p>
              )}
            </div>
          </div>

          <div className='pt-6'>
            <Button type="submit" className="w-full gradient-violet" disabled={isSubmitting}>
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
