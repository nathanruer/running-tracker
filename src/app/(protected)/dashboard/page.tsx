'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import SessionDialog from '@/features/sessions/components/forms/session-dialog';
import { StravaImportDialog } from '@/features/import/components/strava-import-dialog';
import { SessionsTable, type SessionActions } from '@/features/dashboard/components/sessions-table';
import { SessionsEmptyState } from '@/features/dashboard/components/sessions-empty-state';
import { DashboardSkeleton } from '@/features/dashboard/components/dashboard-skeleton';
import { SessionDetailsSheet } from '@/features/sessions/components/details/session-details-sheet';
import { useDashboardData } from '@/features/dashboard/hooks/use-dashboard-data';
import { buttonVariants } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import {
  type StravaActivityDetails,
} from '@/lib/services/api-client';
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

  const handleStravaImport = (data: StravaActivityDetails) => {
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
    <div 
      data-testid="dashboard-container"
      className="w-full py-4 md:py-8 px-3 md:px-6 xl:px-12"
    >
      <div className="mx-auto max-w-[90rem]">
        <h1 data-testid="dashboard-title-mobile" className="text-4xl font-black tracking-tight text-primary mb-8 md:hidden px-1">Dashboard</h1>

        {initialLoading || sessions.length > 0 || selectedType !== 'all' || isFetchingData || isDeleting ? (
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
            isFetching={isFetchingData || allSessionsLoading}
            isShowingAll={isShowingAll}
            onShowAll={() => setIsShowingAll(true)}
          />
        ) : (
          <SessionsEmptyState onAction={openNewSession} />
        )}
      </div>

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

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              data-testid="delete-session-cancel" 
              onClick={() => setDeletingId(null)} 
              className={buttonVariants({ variant: 'neutral', size: 'xl' })}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-session-confirm"
              onClick={() => deletingId && handleDelete(deletingId)}
              className={buttonVariants({ variant: 'destructive-premium', size: 'xl' })}
            >
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardPage;