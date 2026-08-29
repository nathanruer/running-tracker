'use client';

import { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { CloseButton } from '@/components/ui/close-button';

import { cn } from '@/lib/utils';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { importIntervalsSelection, type FormattedStravaActivity } from '@/lib/services/api-client';
import { useExternalActivities } from '../../hooks/use-external-activities';
import { useChunkedImport } from '../../hooks/use-chunked-import';
import { useTableSort } from '@/hooks/use-table-sort';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useInfiniteScrollObserver } from '@/hooks/use-infinite-scroll-observer';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { queryKeys } from '@/lib/constants/query-keys';
import { ImportToolbar } from './import-toolbar';
import { ActivityTable } from './activity-table';
import { ImportFooter } from './import-footer';
import { ImportLoadingSkeleton } from './loading-skeleton';
import { LoadingBar } from '@/components/ui/loading-bar';
import type { ActivityImportContentProps } from './types';

const DEFERRED_ENRICHMENT_REFRESH_MS = 15_000;

export function ActivityImportContent({
  open,
  onOpenChange,
  onImport,
  mode,
  queryClient,
  onBulkImportSuccess,
}: ActivityImportContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const topRef = useRef<HTMLTableSectionElement>(null);

  const {
    activities,
    loading,
    loadingMore,
    hasMore,
    isConnected,
    loadMore,
    totalCount,
    searchLoading,
    isLoadingAll,
    searchProgress,
    loadAllForSearch,
    loadAllActivities,
    cancelLoading,
    refresh,
    isRefreshing,
  } = useExternalActivities(open);

  const chunkedImport = useChunkedImport({
    sendBatch: async (_sessions, externalIds) => {
      const result = await importIntervalsSelection(externalIds);
      return { count: result.imported, skipped: result.skipped };
    },
  });

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

  const importedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const a of activities) {
      if (a.alreadyImported && a.externalId) keys.add(a.externalId);
    }
    for (const key of chunkedImport.importedKeys) {
      keys.add(key);
    }
    return keys;
  }, [activities, chunkedImport.importedKeys]);

  const disabledKeys = importedKeys;

  const importableCount = useMemo(() => {
    return filteredActivities.filter((a) => !a.externalId || !importedKeys.has(a.externalId)).length;
  }, [filteredActivities, importedKeys]);

  const {
    toggleSelectWithEvent,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected,
    getSelectedItems,
    selectedCount,
  } = useTableSelection(filteredActivities, {
    mode: mode === 'complete' ? 'single' : 'multiple',
    getKey: (a) => a.externalId!,
    disabledKeys,
  });

  useEffect(() => {
    clearSelection();
  }, [deferredSearchQuery, clearSelection]);

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
    const selected = getSelectedItems();
    if (selected.length === 0) {
      toast({
        title: 'Attention',
        description: 'Veuillez sélectionner au moins une activité',
      });
      return;
    }

    if (mode === 'complete' || selected.length === 1) {
      const activity = selected[0];
      onImport(activity);
      onOpenChange(false);
      clearSelection();
      return;
    }

    const sessions = selected.map(buildSessionPayload);
    const externalIds = selected.map((a) => a.externalId!);

    const result = await chunkedImport.start(sessions, externalIds);

    if (result.status === 'error' || result.status === 'cancelled') {
      return;
    }

    const parts: string[] = [];
    parts.push(`${result.imported} séance${result.imported > 1 ? 's' : ''} importée${result.imported > 1 ? 's' : ''} avec succès`);
    if (result.skipped > 0) {
      parts.push(`${result.skipped} déjà importée${result.skipped > 1 ? 's' : ''}`);
    }

    toast({
      title: 'Import réussi',
      description: parts.join(' — '),
    });

    clearSelection();

    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionsCountBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionTypesBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.intervalsActivities() });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions() });
      }, DEFERRED_ENRICHMENT_REFRESH_MS);
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
        queryClient.invalidateQueries({ queryKey: queryKeys.intervalsActivities() });
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
            Importer depuis intervals.icu
          </DialogTitle>
          <CloseButton onClick={handleClose} className="absolute right-4 md:right-8 top-6 md:top-8" />
        </div>
        <DialogDescription className="text-sm md:text-base text-muted-foreground/70 font-medium mt-1">
          {mode === 'complete'
            ? 'Sélectionne une course à importer.'
            : 'Sélectionne tes courses synchronisées depuis Garmin.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 min-h-0 flex flex-col relative transform-gpu overflow-hidden">
        <div className="px-4 md:px-8 mt-2">
          <ErrorMessage error={importError} className="mb-4" onRetry={loadMore} />
        </div>
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">intervals.icu non configuré</p>
            <p className="text-xs text-muted-foreground/70 max-w-sm">
              Connecte ton compte depuis Profil → Compte avec ta clé API (Settings → Developer sur intervals.icu).
            </p>
          </div>
        ) : !loading && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Aucune course sur intervals.icu</p>
            <p className="text-xs text-muted-foreground/70 max-w-md leading-relaxed">
              Ta prochaine sortie Garmin apparaîtra ici automatiquement quelques minutes après la synchro de ta montre.
              Pour ton historique, uploade ton export Garmin sur intervals.icu puis reviens ici.
            </p>
            <Button variant="outline" size="sm" onClick={refresh} className="mt-2 rounded-xl">
              Actualiser
            </Button>
          </div>
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
              <ImportLoadingSkeleton />
            </div>

            <div
              className={cn(
                "flex-1 flex flex-col h-full transform-gpu transition-opacity duration-300",
                loading && activities.length === 0 ? "opacity-0" : "opacity-100"
              )}
            >
              <ImportToolbar
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
                <LoadingBar isLoading={loadingMore || isRefreshing} />
                <ActivityTable
                  activities={sortedActivities}
                  filteredActivities={filteredActivities}
                  mode={mode}
                  isSelected={isSelected}
                  isAllSelected={isAllSelected}
                  isSomeSelected={isSomeSelected}
                  importableCount={importableCount}
                  toggleSelectWithEvent={toggleSelectWithEvent}
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
                  importedKeys={importedKeys}
                />
              </div>

              <ImportFooter
                selectedCount={selectedCount}
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
