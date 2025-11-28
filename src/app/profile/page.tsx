'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, User as UserIcon, BarChart3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/components/profile/profile-form';
import { TrainingZonesTable } from '@/components/profile/training-zones-table';
import { AnalyticsView } from '@/components/profile/analytics-view';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, logoutUser, getSessions } from '@/lib/api';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeView, setActiveView] = useState<'profile' | 'analytics'>('profile');

  const { data: user, isLoading: loading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: () => getSessions(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
      return;
    }
  }, [user, loading, router]);

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

  if (!user) {
    return null;
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
          <AnalyticsView sessions={sessions} />
        )}

        {activeView === 'profile' && (
          <div className="grid gap-8 md:grid-cols-3">
            <ProfileForm user={user} />
            <TrainingZonesTable
              maxHeartRate={user.maxHeartRate ?? undefined}
              vma={user.vma ?? undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
