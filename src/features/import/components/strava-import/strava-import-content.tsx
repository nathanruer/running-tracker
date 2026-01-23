'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { bulkImportSessions, type FormattedStravaActivity } from '@/lib/services/api-client';
import { useStravaActivities } from '../../hooks/use-strava-activities';
import { useTableSort } from '@/hooks/use-table-sort';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useToast } from '@/hooks/use-toast';
import { ErrorMessage } from '@/components/ui/error-message';
import { StravaConnectScreen } from './strava-connect-screen';
import { StravaToolbar } from './strava-toolbar';
import { StravaActivitiesTable } from './strava-activities-table';
import { StravaImportFooter } from './strava-import-footer';
import { StravaLoadingSkeleton } from './strava-loading-skeleton';
import type { StravaImportContentProps } from './types';

export function StravaImportContent({
  open,
  onOpenChange,
  onImport,
  mode,
  queryClient,
  onBulkImportSuccess,
}: StravaImportContentProps) {
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLTableSectionElement>(null);

  const {
    activities,
    loading,
    loadingMore,
    loadingAll,
    hasMore,
    totalCount,
    isConnected,
    connectToStrava,
    loadMore,
    loadAll,
    reset,
  } = useStravaActivities(open);

  const { toast } = useToast();
  const { error: importError, wrapAsync } = useErrorHandler({ scope: 'local' });

  useEffect(() => {
    if (!hasMore || loadingMore || loadingAll || !isConnected) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loadingAll, isConnected, loadMore]);

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const lowerQuery = searchQuery.toLowerCase();
    return activities.filter((a) => a.comments.toLowerCase().includes(lowerQuery));
  }, [activities, searchQuery]);

  const { handleSort, SortIcon, defaultComparator, sortColumn } = useTableSort<FormattedStravaActivity>(
    filteredActivities,
    null,
    null
  );

  const sortedActivities = useMemo(() => {
    return defaultComparator((activity: FormattedStravaActivity, column: string) => {
      switch (column) {
        case 'date':
          return new Date(activity.date);
        case 'distance':
          return activity.distance;
        case 'duration':
          return activity.duration;
        case 'pace':
          return activity.avgPace;
        case 'heartRate':
          return activity.avgHeartRate || 0;
        default:
          return '';
      }
    });
  }, [defaultComparator]);

  const {
    selectedIndices,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useTableSelection(filteredActivities, mode === 'complete' ? 'single' : 'multiple');

  const handleImportSelected = wrapAsync(async () => {
    if (selectedIndices.size === 0) {
      toast({
        title: 'Attention',
        description: 'Veuillez sélectionner au moins une activité',
      });
      return;
    }

    setImporting(true);
    try {
      const selectedActivities = Array.from(selectedIndices).map((i) => filteredActivities[i]);

      if (mode === 'complete' || selectedIndices.size === 1) {
        onImport(selectedActivities[0]);
        onOpenChange(false);
        clearSelection();
      } else {
        const sessionsToImport = selectedActivities.map((activity) => ({
          date: activity.date,
          sessionType: '-',
          duration: activity.duration,
          distance: activity.distance,
          avgPace: activity.avgPace,
          avgHeartRate: activity.avgHeartRate || null,
          perceivedExertion: null,
          comments: activity.comments || '',
          externalId: activity.externalId,
          source: activity.source,
          stravaData: activity.stravaData,
          elevationGain: activity.elevationGain,
          averageCadence: activity.averageCadence,
          averageTemp: activity.averageTemp,
          calories: activity.calories,
        }));

        const result = await bulkImportSessions(sessionsToImport);
        
        toast({
          title: 'Import réussi',
          description: `${result.count} séance(s) Strava importée(s) avec succès`,
        });

        clearSelection();

        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        }

        if (onBulkImportSuccess) {
          onBulkImportSuccess();
          onOpenChange(false);
        }
      }
    } finally {
      setImporting(false);
    }
  });

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      <DialogHeader className="px-4 md:px-8 pt-6 md:pt-8 relative w-full items-start text-left">
        <div className="flex w-full items-start justify-between gap-4">
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight">
            Importer depuis Strava
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-xl text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all shrink-0 -mt-1 absolute right-4 md:right-8 top-6 md:top-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <DialogDescription className="text-sm md:text-base text-muted-foreground/70 font-medium mt-1">
          {mode === 'complete'
            ? 'Sélectionnez une activité à importer.'
            : 'Sélectionnez vos activités Strava.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 min-h-0 flex flex-col relative transform-gpu overflow-hidden">
        <div className="px-4 md:px-8 mt-2">
          <ErrorMessage error={importError} className="mb-4" onRetry={loadMore} />
        </div>
        {!isConnected ? (
          <StravaConnectScreen loading={loading} onConnect={connectToStrava} />
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div
              className={cn(
                "absolute inset-0 z-50 flex flex-col bg-background transition-all duration-300",
                loading && activities.length === 0
                  ? "opacity-100 visible"
                  : "opacity-0 invisible pointer-events-none"
              )}
            >
              <StravaLoadingSkeleton />
            </div>

            <div
              className={cn(
                "flex-1 flex flex-col h-full transform-gpu transition-opacity duration-300",
                loading && activities.length === 0 ? "opacity-0" : "opacity-100"
              )}
            >
              <StravaToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activitiesCount={activities.length}
                totalCount={totalCount}
                loading={loading}
                hasMore={hasMore}
                loadingAll={loadingAll}
                loadingMore={loadingMore}
                onLoadAll={loadAll}
                onReset={reset}
                topRef={topRef}
              />

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                {(loadingMore || loadingAll) && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] z-30 overflow-hidden bg-violet-500/10">
                    <div className="h-full w-full bg-violet-500 origin-left animate-loading-bar" />
                  </div>
                )}
                <StravaActivitiesTable
                  activities={sortedActivities}
                  filteredActivities={filteredActivities}
                  mode={mode}
                  selectedIndices={selectedIndices}
                  isSelected={isSelected}
                  isAllSelected={isAllSelected}
                  toggleSelect={toggleSelect}
                  toggleSelectAll={toggleSelectAll}
                  sortColumn={sortColumn}
                  handleSort={handleSort}
                  SortIcon={SortIcon}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  loadingAll={loadingAll}
                  observerTarget={observerTarget}
                  topRef={topRef}
                />
              </div>

              <StravaImportFooter
                selectedCount={selectedIndices.size}
                importing={importing}
                onCancel={() => onOpenChange(false)}
                onImport={handleImportSelected}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
