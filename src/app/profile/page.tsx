'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, LogOut, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, logoutUser, updateUser, type User } from '@/lib/api';

const profileSchema = z.object({
  email: z.string().email('Email invalide'),
  weight: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().optional()
  ),
  age: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().optional()
  ),
  maxHeartRate: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().optional()
  ),
  vma: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().optional()
  ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileFormInputs = {
  email: string;
  weight: string | number;
  age: string | number;
  maxHeartRate: string | number;
  vma: string | number;
};

const ZONES = [
  { name: 'Récup / Très facile', minPct: 0.60, maxPct: 0.68, minVmaPct: 0.50, maxVmaPct: 0.60 },
  { name: 'EF Zone 2 (base)', minPct: 0.68, maxPct: 0.75, minVmaPct: 0.60, maxVmaPct: 0.70 },
  { name: 'EF Zone 2 haute', minPct: 0.75, maxPct: 0.80, minVmaPct: 0.70, maxVmaPct: 0.75 },
  { name: 'Tempo / Seuil aérobie', minPct: 0.80, maxPct: 0.88, minVmaPct: 0.75, maxVmaPct: 0.85 },
  { name: 'Seuil anaérobie', minPct: 0.88, maxPct: 0.92, minVmaPct: 0.85, maxVmaPct: 0.95 },
  { name: 'VMA / Intervalles courts', minPct: 0.92, maxPct: 1.00, minVmaPct: 0.95, maxVmaPct: 1.05 },
];

const calculatePace = (vma: number, percentage: number): string => {
  const speed = vma * percentage;
  const pace = 60 / speed; // min/km
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const { data: user, isLoading: loading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: '',
      weight: '',
      age: '',
      maxHeartRate: '',
      vma: '',
    },
  });

  const maxHeartRate = watch('maxHeartRate');
  const vma = watch('vma');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
      return;
    }

    if (user) {
      setValue('email', user.email);
      setValue('weight', user.weight?.toString() ?? '');
      setValue('age', user.age?.toString() ?? '');
      setValue('maxHeartRate', user.maxHeartRate?.toString() ?? '');
      setValue('vma', user.vma?.toString() ?? '');
    }
  }, [user, loading, router, setValue]);

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

  const onSubmit = (data: any) => {
    const values = data as ProfileFormValues;
    mutation.mutate({
      email: values.email,
      weight: values.weight,
      age: values.age,
      maxHeartRate: values.maxHeartRate,
      vma: values.vma,
    });
  };

  const handleLogout = async () => {
    await logoutUser();
    queryClient.clear();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gradient">Mon Profil</h1>
          </div>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
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
                    <p className="text-sm text-destructive">{errors.email.message as string}</p>
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
                      <p className="text-sm text-destructive">{errors.weight.message as string}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Âge</Label>
                    <Input id="age" type="number" {...register('age')} />
                    {errors.age && (
                      <p className="text-sm text-destructive">{errors.age.message as string}</p>
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
                        {errors.maxHeartRate.message as string}
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
                        {errors.vma.message as string}
                      </p>
                    )}
                  </div>
                </div>

                <div className='pt-6'>
                  <Button type="submit" className="w-full gradient-violet" disabled={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Zones d'entraînement</CardTitle>
              <CardDescription>
                Calculées sur la base de votre FC Max ({maxHeartRate || '--'} bpm) et VMA ({vma || '--'} km/h).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>% FCM</TableHead>
                      <TableHead>FC cible</TableHead>
                      <TableHead>Allure approx.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ZONES.map((zone, index) => {
                      let bpmRange = '--';
                      if (maxHeartRate && !isNaN(Number(maxHeartRate))) {
                        const minBpm = Math.round(Number(maxHeartRate) * zone.minPct);
                        const maxBpm = Math.round(Number(maxHeartRate) * zone.maxPct);
                        bpmRange = `${minBpm}–${maxBpm}`;
                      }

                      let paceRange = '--';
                      if (vma && !isNaN(Number(vma))) {
                        const minPace = calculatePace(Number(vma), zone.maxVmaPct);
                        const maxPace = calculatePace(Number(vma), zone.minVmaPct);
                        paceRange = `${minPace}-${maxPace}`;
                      }

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{zone.name}</TableCell>
                          <TableCell>
                            {Math.round(zone.minPct * 100)}–{Math.round(zone.maxPct * 100)}%
                          </TableCell>
                          <TableCell>{bpmRange}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {paceRange}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}