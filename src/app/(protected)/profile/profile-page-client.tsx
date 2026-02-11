'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { User as UserIcon, BarChart3, LogOut, Loader2, Grid3X3 as ActivityHeatmapIcon } from 'lucide-react';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { PageContainer } from '@/components/layout/page-container';
import { ProfileForm, SecurityForm, TrainingZonesTable, StravaAccountCard } from '@/features/profile/components/account';
import { ProfileContentSkeleton, AnalyticsSkeleton, HistorySkeleton } from '@/features/profile/components/profile-skeleton';
import { getCurrentUser, getSessions, logoutUser } from '@/lib/services/api-client';
import { CACHE_STORAGE_KEY } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/constants/query-keys';
import { useUrlParams } from '@/hooks/use-url-params';
import type { DateRangeType, ChartGranularity } from '@/lib/domain/analytics/date-range';
import {
  DEFAULT_DATE_RANGE,
  DEFAULT_GRANULARITY,
  DEFAULT_PROFILE_TAB,
  VALID_DATE_RANGES,
  VALID_GRANULARITIES,
  VALID_PROFILE_TABS,
  type ProfileTab,
  type ProfileUrlParams,
} from '@/features/profile/constants/profile-url-params';

const AnalyticsView = dynamic(
  () => import('@/features/profile/components/analytics-view').then(mod => mod.AnalyticsView),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false,
  }
);

const ActivityHistory = dynamic(
  () => import('@/features/profile/components/history/activity-history').then(mod => mod.ActivityHistory),
  {
    loading: () => <HistorySkeleton />,
    ssr: false,
  }
);

type ProfilePageClientProps = {
  initialParams: ProfileUrlParams;
};

export default function ProfilePageClient({ initialParams }: ProfilePageClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { params, setParam, setParams } = useUrlParams(
    {
      tab: {
        key: 'tab',
        defaultValue: DEFAULT_PROFILE_TAB as ProfileTab,
        validate: (r) => (VALID_PROFILE_TABS.has(r) ? (r as ProfileTab) : null),
      },
      range: {
        key: 'range',
        defaultValue: DEFAULT_DATE_RANGE as DateRangeType,
        validate: (r) => (VALID_DATE_RANGES.has(r) ? (r as DateRangeType) : null),
      },
      granularity: {
        key: 'granularity',
        defaultValue: DEFAULT_GRANULARITY as ChartGranularity,
        validate: (r) => (VALID_GRANULARITIES.has(r) ? (r as ChartGranularity) : null),
      },
      from: { key: 'from', defaultValue: '' },
      to: { key: 'to', defaultValue: '' },
    },
    { initialValues: initialParams }
  );

  const activeView = params.tab;
  const setActiveView = useCallback((v: ProfileTab) => {
    if (v === 'analytics') {
      setParam('tab', v);
      return;
    }

    setParams({
      tab: v,
      range: DEFAULT_DATE_RANGE,
      granularity: DEFAULT_GRANULARITY,
      from: '',
      to: '',
    });
  }, [setParam, setParams]);
  const handleDateRangeChange = useCallback((v: DateRangeType) => {
    if (v === 'custom') {
      setParam('range', v);
      return;
    }

    setParams({
      range: v,
      from: '',
      to: '',
    });
  }, [setParam, setParams]);

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: user, isLoading: loading } = useQuery({
    queryKey: queryKeys.user(),
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: queryKeys.sessionsAll(user?.id ?? null),
    queryFn: () => getSessions(undefined, undefined, undefined, undefined, undefined, undefined, 'analytics'),
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

  if (!loading && !user) return null;

  const isContentLoading = loading || !user;

  return (
    <PageContainer mobileTitle="Profil" className="px-4 md:px-6 xl:px-12">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-6 md:gap-4 font-medium">
        <div className="flex gap-1 p-1 bg-muted/20 backdrop-blur-md rounded-2xl w-full sm:w-fit border border-border/40 font-medium shadow-sm">
          <Button
            data-testid="tab-profile"
            variant={activeView === 'profile' ? 'default' : 'ghost'}
            onClick={() => setActiveView('profile')}
            className={`flex-1 sm:flex-initial rounded-xl h-9 px-3 sm:px-5 active:scale-95 transition-all text-[11px] sm:text-sm ${activeView === 'profile' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-none' : 'text-muted-foreground hover:bg-white/5'}`}
          >
            <UserIcon className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" />
            Compte
          </Button>
          <Button
            data-testid="tab-analytics"
            variant={activeView === 'analytics' ? 'default' : 'ghost'}
            onClick={() => setActiveView('analytics')}
            className={`flex-1 sm:flex-initial rounded-xl h-9 px-3 sm:px-5 active:scale-95 transition-all text-[11px] sm:text-sm ${activeView === 'analytics' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-none' : 'text-muted-foreground hover:bg-white/5'}`}
          >
            <BarChart3 className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" />
            Analyses
          </Button>
          <Button
            data-testid="tab-history"
            variant={activeView === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveView('history')}
            className={`flex-1 sm:flex-initial rounded-xl h-9 px-3 sm:px-5 active:scale-95 transition-all text-[11px] sm:text-sm ${activeView === 'history' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-none' : 'text-muted-foreground hover:bg-white/5'}`}
          >
            <ActivityHeatmapIcon className="mr-1.5 sm:mr-2 h-4 w-4 shrink-0" />
            Historique
          </Button>
        </div>

        <Button
          data-testid="logout-desktop"
          variant="destructive-premium"
          size="xl"
          onClick={() => setShowLogoutDialog(true)}
          className="hidden md:flex shrink-0 border-destructive/20 hover:border-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>

      {activeView === 'analytics' && (
        isContentLoading || isSessionsLoading ? (
          <AnalyticsSkeleton />
        ) : (
          <AnalyticsView
            sessions={sessions}
            dateRange={params.range}
            onDateRangeChange={handleDateRangeChange}
            granularity={params.granularity}
            onGranularityChange={(v) => setParam('granularity', v)}
            customStartDate={params.from}
            onCustomStartDateChange={(v) => setParam('from', v)}
            customEndDate={params.to}
            onCustomEndDateChange={(v) => setParam('to', v)}
          />
        )
      )}

      {activeView === 'history' && (
        isContentLoading || isSessionsLoading ? (
          <HistorySkeleton />
        ) : (
          <ActivityHistory sessions={sessions} />
        )
      )}

      {activeView === 'profile' && (
        isContentLoading ? (
          <ProfileContentSkeleton />
        ) : (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2 items-start">
              <div className="space-y-6 order-1">
                <ProfileForm user={user} />
                <SecurityForm />
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
                variant="destructive-premium"
                size="xl"
                className="w-full border-destructive/20 hover:border-destructive"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Se déconnecter
              </Button>
            </div>
          </div>
        )
      )}

      <ConfirmationDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Déconnexion"
        description="Êtes-vous sûr de vouloir fermer votre session ?"
        confirmLabel="Confirmer la déconnexion"
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
        cancelTestId="logout-cancel"
        confirmTestId="logout-confirm"
      />
    </PageContainer>
  );
}
