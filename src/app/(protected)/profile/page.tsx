'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { User as UserIcon, BarChart3, LogOut, Loader2, Grid3X3 as ActivityHeatmapIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { ProfileForm } from '@/features/profile/components/account/profile-form';
import { TrainingZonesTable } from '@/features/profile/components/account/training-zones-table';
import { StravaAccountCard } from '@/features/profile/components/account/strava-account-card';
import { ProfileSkeleton, AnalyticsSkeleton, HistorySkeleton } from '@/features/profile/components/profile-skeleton';
import { getCurrentUser, getSessions, logoutUser } from '@/lib/services/api-client';
import { CACHE_STORAGE_KEY } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

const AnalyticsView = dynamic(
  () => import('@/features/profile/components/analytics-view').then(mod => mod.AnalyticsView),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false
  }
);

const ActivityHistory = dynamic(
  () => import('@/features/profile/components/history/activity-history').then(mod => mod.ActivityHistory),
  {
    loading: () => <HistorySkeleton />,
    ssr: false
  }
);

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'profile' | 'analytics' | 'history'>('profile');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: user, isLoading: loading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: () => getSessions(),
    enabled: !!user && (activeView === 'analytics' || activeView === 'history'),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!loading && user === null) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutUser();

      queryClient.clear();

      if (typeof window !== 'undefined') {
        localStorage.removeItem(CACHE_STORAGE_KEY);
      }

      window.location.href = '/';
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

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) return null;

  return (
    <div className="w-full py-4 md:py-8 px-3 md:px-6 xl:px-12">
      <div className="mx-auto max-w-[90rem]">
        <h1 data-testid="profile-title-mobile" className="text-3xl font-extrabold text-primary mb-6 md:hidden px-1">Profil</h1>

        <div className="mb-8 flex items-center justify-center sm:justify-between gap-4">
          <div className="flex gap-1 p-1 bg-muted/20 backdrop-blur-md rounded-2xl w-fit border border-border/40 font-medium shadow-sm">
            <Button
              data-testid="tab-profile"
              variant={activeView === 'profile' ? 'default' : 'ghost'}
              onClick={() => setActiveView('profile')}
              className={`rounded-xl h-9 px-3 sm:px-5 active:scale-95 transition-all text-xs sm:text-sm ${activeView === 'profile' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-none' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <UserIcon className="mr-2 h-4 w-4 shrink-0" />
              Compte
            </Button>
            <Button
              data-testid="tab-analytics"
              variant={activeView === 'analytics' ? 'default' : 'ghost'}
              onClick={() => setActiveView('analytics')}
              className={`rounded-xl h-9 px-3 sm:px-5 active:scale-95 transition-all text-xs sm:text-sm ${activeView === 'analytics' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-none' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <BarChart3 className="mr-2 h-4 w-4 shrink-0" />
              Analyses
            </Button>
            <Button
              data-testid="tab-history"
              variant={activeView === 'history' ? 'default' : 'ghost'}
              onClick={() => setActiveView('history')}
              className={`rounded-xl h-9 px-3 sm:px-5 active:scale-95 transition-all text-xs sm:text-sm ${activeView === 'history' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-none' : 'text-muted-foreground hover:bg-white/5'}`}
            >
              <ActivityHeatmapIcon className="mr-2 h-4 w-4 shrink-0" />
              Historique
            </Button>
          </div>

          <Button
            data-testid="logout-desktop"
            variant="outline"
            size="sm"
            onClick={() => setShowLogoutDialog(true)}
            className="hidden md:flex shrink-0 h-9 px-5 text-sm font-semibold text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive active:scale-95 transition-all rounded-xl shadow-sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>

        {activeView === 'analytics' && (
          isSessionsLoading ? (
            <AnalyticsSkeleton />
          ) : (
            <AnalyticsView sessions={sessions} />
          )
        )}

        {activeView === 'history' && (
          isSessionsLoading ? (
            <HistorySkeleton />
          ) : (
            <ActivityHistory sessions={sessions} />
          )
        )}

        {activeView === 'profile' && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2 items-start">
              <div className="space-y-6 order-1">
                <ProfileForm user={user} />
              </div>
              
              <div className="space-y-8 order-2">
                <TrainingZonesTable
                  maxHeartRate={user.maxHeartRate ?? undefined}
                  vma={user.vma ?? undefined}
                />
                <StravaAccountCard stravaId={user.stravaId} />
              </div>
            </div>

            <div className="md:hidden pt-4">
              <Button
                data-testid="logout-mobile"
                onClick={() => setShowLogoutDialog(true)}
                variant="outline"
                className="w-full h-12 rounded-xl text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground font-bold transition-all"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Se déconnecter
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Déconnexion</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Êtes-vous sûr de vouloir fermer votre session ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel data-testid="logout-cancel" disabled={isLoggingOut} className="rounded-xl px-6 active:scale-95 transition-all">Annuler</AlertDialogCancel>
            <AlertDialogAction
              data-testid="logout-confirm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-6 font-bold active:scale-95 transition-all"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Déconnexion...
                </>
              ) : (
                'Confirmer la déconnexion'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
