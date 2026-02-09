'use client';

import { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getStravaActivityDetails, type FormattedStravaActivity } from '@/lib/services/api-client';
import { useStravaActivities } from '../../hooks/use-strava-activities';
import { useChunkedImport } from '../../hooks/use-chunked-import';
import { useTableSort } from '@/hooks/use-table-sort';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useInfiniteScrollObserver } from '@/hooks/use-infinite-scroll-observer';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useToast } from '@/hooks/use-toast';
import { ErrorMessage } from '@/components/ui/error-message';
import { queryKeys } from '@/lib/constants/query-keys';
import { StravaConnectScreen } from './strava-connect-screen';
import { StravaToolbar } from './strava-toolbar';
import { StravaActivitiesTable } from './strava-activities-table';
import { StravaImportFooter } from './strava-import-footer';
import { StravaLoadingSkeleton } from './strava-loading-skeleton';
import { LoadingBar } from '@/components/ui/loading-bar';
import type { StravaImportContentProps } from './types';

export function StravaImportContent({
  open,
  onOpenChange,
  onImport,
  mode,
  queryClient,
  onBulkImportSuccess,
}: StravaImportContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const topRef = useRef<HTMLTableSectionElement>(null);

  const {
    activities,
    loading,
    loadingMore,
    hasMore,
    isConnected,
    connectToStrava,
    loadMore,
    totalCount,
    searchLoading,
    isLoadingAll,
    searchProgress,
    loadAllForSearch,
    loadAllActivities,
    cancelLoading,
  } = useStravaActivities(open);

  const chunkedImport = useChunkedImport();

  const { toast } = useToast();
  const { error: importError, wrapAsync } = useErrorHandler({ scope: 'local' });

  const { observerRef: observerTarget } = useInfiniteScrollObserver({
    enabled: hasMore && !loadingMore && !!isConnected,
    onIntersect: loadMore,
  });

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredActivities = useMemo(() => {
    if (!deferredSearchQuery.trim()) return activities;
    const lowerQuery = deferredSearchQuery.toLowerCase();
    return activities.filter((a) => a.comments.toLowerCase().includes(lowerQuery));
  }, [activities, deferredSearchQuery]);

  useEffect(() => {
    if (!deferredSearchQuery.trim()) return;
    if (!hasMore) return;
    if (searchLoading) return;

    const hasResults = activities.some((a) =>
      a.comments.toLowerCase().includes(deferredSearchQuery.toLowerCase())
    );

    if (!hasResults && activities.length > 0) {
      const timer = setTimeout(() => {
        loadAllForSearch(deferredSearchQuery);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [deferredSearchQuery, activities, hasMore, searchLoading, loadAllForSearch]);

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

  const buildSessionPayload = (activity: FormattedStravaActivity) => ({
    date: activity.date,
    sessionType: null,
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
  });

  const handleImportSelected = wrapAsync(async () => {
    if (selectedIndices.size === 0) {
      toast({
        title: 'Attention',
        description: 'Veuillez sélectionner au moins une activité',
      });
      return;
    }

    const selectedActivities = Array.from(selectedIndices).map((i) => filteredActivities[i]);

    if (mode === 'complete' || selectedIndices.size === 1) {
      const activity = selectedActivities[0];
      onImport(activity);
      onOpenChange(false);
      clearSelection();

      if (activity.externalId) {
        getStravaActivityDetails(activity.externalId)
          .then((detailed) => onImport(detailed))
          .catch(() => {});
      }
      return;
    }

    const indices = Array.from(selectedIndices);
    const sessions = selectedActivities.map(buildSessionPayload);

    const result = await chunkedImport.start(sessions, indices);

    if (chunkedImport.status === 'error' || chunkedImport.status === 'cancelled') {
      return;
    }

    toast({
      title: 'Import réussi',
      description: `${result.imported} séance${result.imported > 1 ? 's' : ''} Strava importée${result.imported > 1 ? 's' : ''} avec succès`,
    });

    clearSelection();

    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionsCountBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionTypesBase() });
    }

    if (onBulkImportSuccess) {
      onBulkImportSuccess();
      onOpenChange(false);
    }
  });

  const handleCancelImport = () => {
    chunkedImport.cancel();
  };

  const handleClose = () => {
    if (chunkedImport.status !== 'idle') {
      if (chunkedImport.progress.imported > 0 && queryClient) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionsCountBase() });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionTypesBase() });
      }
      chunkedImport.reset();
      clearSelection();
    }
    onOpenChange(false);
  };

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
            onClick={handleClose}
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
                filteredCount={filteredActivities.length}
                loading={loading}
                hasMore={hasMore}
                searchLoading={searchLoading}
                isLoadingAll={isLoadingAll}
                searchProgress={searchProgress}
                onLoadAll={loadAllActivities}
                onCancelLoadAll={cancelLoading}
              />

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                <LoadingBar isLoading={loadingMore} />
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
                  observerTarget={observerTarget}
                  topRef={topRef}
                  searchQuery={deferredSearchQuery}
                  searchLoading={searchLoading}
                  totalCount={totalCount}
                  totalLoadedCount={activities.length}
                  onSearchAll={() => loadAllForSearch(deferredSearchQuery)}
                  importedIndices={chunkedImport.importedIndices}
                />
              </div>

              <StravaImportFooter
                selectedCount={selectedIndices.size}
                status={chunkedImport.status}
                progress={chunkedImport.progress}
                onCancel={handleClose}
                onImport={handleImportSelected}
                onCancelImport={handleCancelImport}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
