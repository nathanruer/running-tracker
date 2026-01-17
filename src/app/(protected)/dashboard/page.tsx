'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import SessionDialog from '@/features/sessions/components/forms/session-dialog';
import { StravaImportDialog } from '@/features/import';
import { SessionsTable, type SessionActions } from '@/features/dashboard/components/sessions-table';
import { SessionsEmptyState } from '@/features/dashboard/components/sessions-empty-state';
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton';
import { SessionDetailsSheet } from '@/features/sessions/components/details/session-details-sheet';
import { useDashboardData } from '@/features/dashboard/hooks/use-dashboard-data';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { PageContainer } from '@/components/layout/page-container';
import { useToast } from '@/hooks/use-toast';
import { type FormattedStravaActivity } from '@/features/import';
import {
  type TrainingSession,
  type TrainingSessionPayload,
} from '@/lib/types';

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isShowingAll, setIsShowingAll] = useState(false);
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
    user,
    userLoading,
    availableTypes,
    sessions,
    initialLoading,
    showGlobalLoading,
    isFetchingData,
    allSessionsLoading,
    allSessionsData,
    hasMore,
    isFetchingNextPage,
    fetchNextPage,
    handleResetPagination,
    mutations,
  } = useDashboardData(selectedType, isShowingAll, setIsShowingAll);

  const { handleDelete: deleteMutation, handleBulkDelete, handleEntitySuccess, isDeleting } = mutations;

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

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
  };

  const sessionDialogInitialData = useMemo(() => {
    if (!importedData) return null;
    return {
      ...importedData,
      date: importedData.date ?? undefined,
      duration: importedData.duration ?? undefined,
      avgPace: importedData.avgPace ?? undefined,
    };
  }, [importedData]);

  if (!user && !userLoading) {
    return <DashboardSkeleton />;
  }
  if (showGlobalLoading || !user) {
    return <DashboardSkeleton />;
  }

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
    return editingSession.status === 'planned' ? 'complete' : 'edit';
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

  const sessionActions: SessionActions = {
    onEdit: handleEdit,
    onDelete: setDeletingId,
    onBulkDelete: handleBulkDelete,
    onView: (session) => {
      setViewingSession(session);
      setIsDetailsSheetOpen(true);
    },
    onNewSession: openNewSession,
  };

  return (
    <PageContainer testId="dashboard-container" mobileTitle="Dashboard">
      {initialLoading || sessions.length > 0 || selectedType !== 'all' ? (
        <SessionsTable
          sessions={sessions}
          availableTypes={availableTypes}
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          actions={sessionActions}
          initialLoading={initialLoading}
          paginatedCount={sessions.length}
          totalCount={allSessionsData?.length || 0}
          onResetPagination={handleResetPagination}
          hasMore={hasMore && !isShowingAll}
          isFetchingNextPage={isFetchingNextPage || (isShowingAll && allSessionsLoading)}
          onLoadMore={fetchNextPage}
          isFetching={isFetchingData || allSessionsLoading || isDeleting}
          isShowingAll={isShowingAll}
          onShowAll={() => setIsShowingAll(true)}
        />
      ) : (
        <SessionsEmptyState onAction={openNewSession} />
      )}

      <SessionDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onClose={handleDialogClose}
        onSuccess={handleEntitySuccess}
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
};

export default DashboardPage;