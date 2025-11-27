'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, LogOut, Save, TrendingUp, Activity, Calendar, User as UserIcon, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, logoutUser, updateUser, getSessions, type User, type TrainingSession } from '@/lib/api';

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | '30days' | 'all'>('all');
  const [activeView, setActiveView] = useState<'profile' | 'analytics'>('profile');

  const { data: user, isLoading: loading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: () => getSessions(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
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

  const getFilteredSessions = () => {
    const now = new Date();
    const filtered = sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      if (dateRange === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return sessionDate >= oneWeekAgo;
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return sessionDate >= thirtyDaysAgo;
      }
      return true;
    });
    return filtered;
  };

  const filteredSessions = getFilteredSessions();

  const calculateStats = () => {
    if (!filteredSessions || filteredSessions.length === 0) {
      return { 
        totalKm: 0, 
        totalSessions: 0, 
        averageKmPerWeek: 0,
        chartData: []
      };
    }

    const weeklyKm: Record<number, number> = {};
    let totalKm = 0;

    filteredSessions.forEach((session) => {
      const week = session.week;
      if (!weeklyKm[week]) {
        weeklyKm[week] = 0;
      }
      weeklyKm[week] += session.distance;
      totalKm += session.distance;
    });

    const weeks = Object.keys(weeklyKm).length;
    const averageKmPerWeek = weeks > 0 ? totalKm / weeks : 0;

    const chartData = Object.entries(weeklyKm)
      .map(([week, km]) => ({
        semaine: `S${week}`,
        week: Number(week),
        km: Number(km.toFixed(1)),
      }))
      .sort((a, b) => a.week - b.week);

    return {
      totalKm,
      totalSessions: filteredSessions.length,
      averageKmPerWeek,
      chartData,
    };
  };

  const stats = calculateStats();

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
    try {
      setIsLoggingOut(true);
      
      queryClient.clear();
      
      await logoutUser();
      
      router.replace('/');

      toast({
        title: 'Déconnexion réussie',
        description: 'À bientôt!',
      });
    } catch (error) {
      setIsLoggingOut(false);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la déconnexion',
    variant: 'destructive',
      });
    }
  };

  if (isLoggingOut) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Déconnexion...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
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

          <div className="mb-8">
            <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
              <Button
                variant={activeView === 'profile' ? 'default' : 'ghost'}
                onClick={() => setActiveView('profile')}
                className={`${activeView === 'profile' ? 'gradient-violet' : ''}`}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Profil
              </Button>
              <Button
                variant={activeView === 'analytics' ? 'default' : 'ghost'}
                onClick={() => setActiveView('analytics')}
                className={`${activeView === 'analytics' ? 'gradient-violet' : ''}`}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyse
              </Button>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1 rounded-lg border border-border/50 bg-card p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted/70" />
                </div>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 50}ms` }} />
                      <div className="h-10 w-full animate-pulse rounded-md bg-muted" style={{ animationDelay: `${i * 50}ms` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 rounded-lg border border-border/50 bg-card p-6">
              <div className="space-y-4">
                <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-64 animate-pulse rounded bg-muted/70" />
                <div className="space-y-2 mt-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 30}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
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

        <div className="mb-8">
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
            <Button
              variant={activeView === 'profile' ? 'default' : 'ghost'}
              onClick={() => setActiveView('profile')}
              className={`${activeView === 'profile' ? 'gradient-violet' : ''}`}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Profil
            </Button>
            <Button
              variant={activeView === 'analytics' ? 'default' : 'ghost'}
              onClick={() => setActiveView('analytics')}
              className={`${activeView === 'analytics' ? 'gradient-violet' : ''}`}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Analyse
            </Button>
          </div>
        </div>

        {activeView === 'analytics' && (
          <div className="mb-8">
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card className="border-border/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Kilomètres
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-violet-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gradient">
                    {stats.totalKm.toFixed(1)} km
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sur la période sélectionnée
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Séances Totales
                    </CardTitle>
                    <Activity className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gradient">
                    {stats.totalSessions}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Entraînements enregistrés
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-green-500/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Moyenne Hebdomadaire
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gradient">
                    {stats.averageKmPerWeek.toFixed(1)} km
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Par semaine en moyenne
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Évolution hebdomadaire</CardTitle>
                    <CardDescription>
                      Kilomètres parcourus par semaine
                    </CardDescription>
                  </div>
                  <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Dernière semaine</SelectItem>
                      <SelectItem value="30days">30 derniers jours</SelectItem>
                      <SelectItem value="all">Toutes les données</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={stats.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                      <XAxis 
                        dataKey="semaine" 
                        stroke="#888"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#888"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Kilomètres', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: any) => [`${value} km`, 'Distance']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="km" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Kilomètres"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    <p>Aucune donnée disponible pour cette période</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'profile' && (
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
        )}
      </div>
    </div>
  );
}