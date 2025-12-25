'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { User as UserIcon, BarChart3, Calendar, LogOut, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProfileForm } from '@/components/profile/profile-form';
import { TrainingZonesTable } from '@/components/profile/training-zones-table';
import { AnalyticsView } from '@/components/profile/analytics-view';
import { CalendarView } from '@/components/profile/calendar-view';
import { StravaAccountCard } from '@/components/profile/strava-account-card';
import { getCurrentUser, getSessions } from '@/lib/services/api-client';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'profile' | 'analytics' | 'calendar'>('profile');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/');

      toast({
        title: 'Déconnexion réussie',
        description: 'À bientôt!',
      });
    } catch {
      setIsLoggingOut(false);
      setShowLogoutDialog(false);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la déconnexion',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
        <div className="mx-auto max-w-[90rem]">
          <h1 className="text-4xl font-bold text-gradient mb-8 md:hidden">Mon Profil</h1>

          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-full sm:w-fit overflow-x-auto">
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
              <Button
                variant={activeView === 'calendar' ? 'default' : 'ghost'}
                onClick={() => setActiveView('calendar')}
                className={`${activeView === 'calendar' ? 'gradient-violet' : ''}`}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Calendrier
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowLogoutDialog(true)}
              className="hidden md:flex shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </Button>
          </div>

          <div className="grid gap-8 md:grid-cols-3 items-start">
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

          <Card className="md:hidden mt-8 border-border/50 bg-card">
            <CardContent className="p-6">
              <Button
                onClick={() => setShowLogoutDialog(true)}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Se déconnecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
      <div className="mx-auto max-w-[90rem]">
        <h1 className="text-4xl font-bold text-gradient mb-8 md:hidden">Mon Profil</h1>

        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-full sm:w-fit overflow-x-auto">
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
            <Button
              variant={activeView === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setActiveView('calendar')}
              className={`${activeView === 'calendar' ? 'gradient-violet' : ''}`}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Calendrier
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => setShowLogoutDialog(true)}
            className="hidden md:flex shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>

        {activeView === 'analytics' && (
          <AnalyticsView sessions={sessions} />
        )}

        {activeView === 'calendar' && (
          <CalendarView sessions={sessions} />
        )}

        {activeView === 'profile' && (
          <>
            <div className="grid gap-8 md:grid-cols-3 items-start">
              <div className="space-y-6">
                <ProfileForm user={user} />
                <StravaAccountCard stravaId={user.stravaId} />
              </div>
              <TrainingZonesTable
                maxHeartRate={user.maxHeartRate ?? undefined}
                vma={user.vma ?? undefined}
              />
            </div>

            <Card className="md:hidden mt-8 border-border/50 bg-card">
              <CardContent className="p-6">
                <Button
                  onClick={() => setShowLogoutDialog(true)}
                  variant="destructive"
                  className="w-full"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Déconnexion...
                </>
              ) : (
                'Se déconnecter'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
