'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import SessionDialog from '@/features/sessions/components/forms/session-dialog';
import { StravaImportDialog } from '@/features/import';
import { SessionsTable, type SessionActions } from '@/features/dashboard/components/sessions-table';
import { SessionsEmptyState } from '@/features/dashboard/components/sessions-empty-state';
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton';
import { SessionDetailsSheet } from '@/features/sessions/components/details/session-details-sheet';
import { useDashboardData } from '@/features/dashboard/hooks/use-dashboard-data';
import { useDashboardFilters } from '@/features/dashboard/hooks/use-dashboard-filters';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { PageContainer } from '@/components/layout/page-container';
import { useToast } from '@/hooks/use-toast';
import { type FormattedStravaActivity } from '@/features/import';
import {
  type TrainingSession,
  type TrainingSessionPayload,
} from '@/lib/types';
import { getSessionById } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';
import { isPlanned } from '@/lib/domain/sessions/session-selectors';

const SESSION_DETAILS_STALE_TIME = 5 * 60 * 1000;

function DashboardContent() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [viewingSession, setViewingSession] = useState<TrainingSession | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [isStravaDialogOpen, setIsStravaDialogOpen] = useState(false);
  const [importedData, setImportedData] = useState<TrainingSessionPayload | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const {
    searchQuery, handleSearchChange,
    selectedType, handleTypeChange,
    period, dateFrom, handlePeriodChange,
    sortConfig, sortParam, handleSort,
  } = useDashboardFilters();

  const {
    user,
    userLoading,
    availableTypes,
    sessions,
    totalCount,
    initialLoading,
    isFetchingData,
    hasMore,
    isFetchingNextPage,
    fetchNextPage,
    loadAllPages,
    cancelLoadAll,
    isLoadingAll,
    mutations,
  } = useDashboardData(selectedType, sortParam, searchQuery, dateFrom);

  const { handleDelete: deleteMutation, handleBulkDelete, handleEntitySuccess, deletingIds } = mutations;

  const handleSessionSuccess = (session: TrainingSession) => {
    handleEntitySuccess(session);
    queryClient.setQueryData(queryKeys.sessionById(session.id), session);
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionById(session.id) });
  };

  useEffect(() => {
    if (!isDetailsSheetOpen) {
      const timer = setTimeout(() => setViewingSession(null), 300);
      return () => clearTimeout(timer);
    }
  }, [isDetailsSheetOpen]);

  useEffect(() => {
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const success = searchParams.get('success');

    if (success === 'strava_connected') {
      toast({
        title: 'Succès',
        description: 'Votre compte Strava a été connecté avec succès!',
      });
      router.replace('/dashboard', { scroll: false });
    }
  }, [toast, router]);

  useEffect(() => {
    if (!userLoading && user === null) {
      router.replace('/');
    }
  }, [user, userLoading, router]);

  const sessionDialogInitialData = useMemo(() => {
    if (!importedData) return null;
    return {
      ...importedData,
      date: importedData.date ?? undefined,
      duration: importedData.duration ?? undefined,
      avgPace: importedData.avgPace ?? undefined,
      sessionType: importedData.sessionType ?? undefined,
    };
  }, [importedData]);

  const handleDelete = async (id: string) => {
    setDeletingId(null);
    await deleteMutation(id);
  };

  const openNewSession = () => {
    setEditingSession(null);
    setImportedData(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (session: TrainingSession) => {
    setEditingSession(session);
    setImportedData(null);
    setIsDialogOpen(true);
  };

  const getDialogMode = () => {
    if (!editingSession) return 'create';
    return isPlanned(editingSession) ? 'complete' : 'edit';
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
  };

  const handleStravaImport = (data: FormattedStravaActivity) => {
    setImportedData(data as TrainingSessionPayload);
    setIsDialogOpen(true);
  };

  const handleRequestStravaImport = () => {
    setIsStravaDialogOpen(true);
  };

  const prefetchSessionDetails = useCallback(
    (sessionId: string) => {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.sessionById(sessionId),
        queryFn: () => getSessionById(sessionId),
        staleTime: SESSION_DETAILS_STALE_TIME,
      });
    },
    [queryClient]
  );

  const handleViewSession = useCallback(
    (session: TrainingSession) => {
      setViewingSession(session);
      setIsDetailsSheetOpen(true);

      const cached = queryClient.getQueryData<TrainingSession>(
        queryKeys.sessionById(session.id)
      );
      if (cached) {
        setViewingSession(cached);
      }

      void queryClient.fetchQuery({
        queryKey: queryKeys.sessionById(session.id),
        queryFn: () => getSessionById(session.id),
        staleTime: SESSION_DETAILS_STALE_TIME,
      }).then((freshSession) => {
        setViewingSession(freshSession);
      }).catch(() => {
        // Keep existing session data if refresh fails.
      });
    },
    [queryClient]
  );

  const sessionActions: SessionActions = {
    onEdit: handleEdit,
    onDelete: setDeletingId,
    onBulkDelete: handleBulkDelete,
    onView: handleViewSession,
    onPrefetchDetails: prefetchSessionDetails,
    onNewSession: openNewSession,
  };

  if (!user) {
    return <DashboardSkeleton />;
  }

  return (
    <PageContainer testId="dashboard-container" mobileTitle="Dashboard">
      {initialLoading || sessions.length > 0 || selectedType !== 'all' || searchQuery.trim() !== '' || period !== 'all' ? (
        <SessionsTable
          sessions={sessions}
          availableTypes={availableTypes}
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          actions={sessionActions}
          initialLoading={initialLoading}
          totalCount={totalCount}
          hasMore={hasMore ?? false}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          isFetching={isFetchingData}
          deletingIds={deletingIds}
          sortConfig={sortConfig}
          onSort={handleSort}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          period={period}
          onPeriodChange={handlePeriodChange}
          loadAllPages={loadAllPages}
          cancelLoadAll={cancelLoadAll}
          isLoadingAll={isLoadingAll}
        />
      ) : (
        <SessionsEmptyState onAction={openNewSession} />
      )}

      <SessionDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onClose={handleDialogClose}
        onSuccess={handleSessionSuccess}
        session={editingSession}
        initialData={sessionDialogInitialData}
        mode={getDialogMode()}
        onRequestStravaImport={handleRequestStravaImport}
      />

      <SessionDetailsSheet
        open={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
        session={viewingSession}
      />

      <StravaImportDialog
        open={isStravaDialogOpen}
        onOpenChange={setIsStravaDialogOpen}
        onImport={handleStravaImport}
        mode={getDialogMode()}
        queryClient={queryClient}
        onBulkImportSuccess={() => {
          setIsDialogOpen(false);
          setEditingSession(null);
          setImportedData(null);
        }}
      />

      <ConfirmationDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible."
        confirmLabel="Confirmer la suppression"
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
        cancelTestId="delete-session-cancel"
        confirmTestId="delete-session-confirm"
      />
    </PageContainer>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
