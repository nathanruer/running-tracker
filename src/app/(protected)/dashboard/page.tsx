'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import SessionDialog from '@/features/sessions/components/forms/session-dialog';
import { StravaImportDialog } from '@/features/import/components/strava-import-dialog';
import { SessionsTable, type SessionActions } from '@/features/dashboard/components/sessions-table';
import { SessionsEmptyState } from '@/features/dashboard/components/sessions-empty-state';
import { SessionDetailsSheet } from '@/features/sessions/components/details/session-details-sheet';
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
import { useToast } from '@/hooks/use-toast';
import { useEntityMutations } from '@/hooks/use-entity-mutations';
import {
  getCurrentUser,
  getSessions,
  getSessionTypes,
  deleteSession,
  bulkDeleteSessions,
} from '@/lib/services/api-client';
import {
  type TrainingSession,
  type TrainingSessionPayload,
} from '@/lib/types';

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'paginated' | 'all'>('paginated');
  const [selectedType, setSelectedType] = useState<string>('all');
  const LIMIT = 10;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] =
    useState<TrainingSession | null>(null);
  const [viewingSession, setViewingSession] = useState<TrainingSession | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);

  useEffect(() => {
    if (!isDetailsSheetOpen) {
      const timer = setTimeout(() => setViewingSession(null), 300);
      return () => clearTimeout(timer);
    }
  }, [isDetailsSheetOpen]);
  const [isStravaDialogOpen, setIsStravaDialogOpen] = useState(false);
  const [importedData, setImportedData] = useState<TrainingSessionPayload | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const { data: availableTypes = [] } = useQuery({
    queryKey: ['sessionTypes'],
    queryFn: async () => {
      const types = await getSessionTypes();
      return types.sort();
    },
    staleTime: 15 * 60 * 1000,
  });


  const { handleDelete: deleteMutation, handleBulkDelete, handleEntitySuccess, isDeleting } =
    useEntityMutations<TrainingSession>({
      baseQueryKey: 'sessions',
      filterType: selectedType,
      deleteEntity: deleteSession,
      bulkDeleteEntities: async (ids: string[]) => {
        await bulkDeleteSessions(ids);
      },
      relatedQueryKeys: ['sessionTypes'],
      messages: {
        deleteSuccess: 'Séance supprimée',
        deleteSuccessDescription: 'La séance a été supprimée avec succès.',
        bulkDeleteSuccessTitle: 'Séances supprimées',
        bulkDeleteSuccess: (count) => `${count} séance${count > 1 ? 's' : ''} ${count > 1 ? 'ont' : 'a'} été supprimée${count > 1 ? 's' : ''} avec succès.`,
        deleteError: 'Erreur lors de la suppression',
        bulkDeleteError: 'Erreur lors de la suppression groupée',
      },
    });

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

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });


  const { 
    data: allSessionsData, 
    isLoading: allSessionsLoading,
    isFetching: allSessionsFetching
  } = useQuery({
    queryKey: ['sessions', 'all', selectedType],
    queryFn: () => getSessions(undefined, undefined, selectedType),
    enabled: viewMode === 'all' && !!user,
    placeholderData: (previousData) => {
      if (previousData) return previousData;
      
      const paginatedData = queryClient.getQueryData<InfiniteData<TrainingSession[]>>(['sessions', 'paginated', selectedType]);
      
      if (paginatedData) {
        const lastPage = paginatedData.pages[paginatedData.pages.length - 1];
        if (lastPage && lastPage.length < LIMIT) {
          return paginatedData.pages.flat();
        }
      }
      
      return undefined;
    },
  });

  const {
    data: paginatedSessionsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: paginatedSessionsLoading,
    isFetching: paginatedSessionsFetching
  } = useInfiniteQuery({
    queryKey: ['sessions', 'paginated', selectedType],
    queryFn: ({ pageParam }) => getSessions(LIMIT, pageParam, selectedType),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    enabled: viewMode === 'paginated' && !!user,
    placeholderData: (previousData) => previousData,
  });

  const sessions = viewMode === 'all'
    ? (allSessionsData || [])
    : (paginatedSessionsData?.pages.flat() || []);

  const isFetchingData = viewMode === 'all' ? allSessionsFetching : paginatedSessionsFetching;
  
  const initialLoading = userLoading || (
    !sessions.length && (
      viewMode === 'all' 
        ? (allSessionsLoading || allSessionsFetching || isDeleting) 
        : (paginatedSessionsLoading || paginatedSessionsFetching || isDeleting)
    )
  );
  
  const hasMore = viewMode === 'paginated' ? hasNextPage : false;

  const loadMoreSessions = () => {
    fetchNextPage();
  };

  const showGlobalLoading = userLoading || (
    !allSessionsData && !paginatedSessionsData && (allSessionsLoading || paginatedSessionsLoading)
  );

  useEffect(() => {
    if (!userLoading && !user) {
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
    };
  }, [importedData]);

  if (!user && !userLoading) {
    return null;
  }

  if (showGlobalLoading) {
    return (
      <div className="w-full py-4 md:py-8 px-3 md:px-6 xl:px-12">
        <div className="mx-auto max-w-[90rem]">
          <h1 className="text-3xl font-extrabold text-gradient mb-6 md:hidden px-1">Dashboard</h1>

          <SessionsTable
            sessions={[]}
            availableTypes={[]}
            selectedType="all"
            onTypeChange={() => {}}
            viewMode="paginated"
            onViewModeChange={() => {}}
            actions={{
              onEdit: () => {},
              onDelete: () => {},
              onBulkDelete: async () => {},
            }}
            initialLoading={true}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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

  const handleStravaImport = (data: Record<string, unknown>) => {
    setImportedData(data as TrainingSessionPayload);
    setIsDialogOpen(true);
  };

  const handleRequestStravaImport = () => {
    setIsStravaDialogOpen(true);
  };

  if (!user) {
    return null;
  }

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
        <h1 data-testid="dashboard-title-mobile" className="text-3xl font-extrabold text-gradient mb-6 md:hidden px-1">Dashboard</h1>

        {initialLoading || sessions.length > 0 || selectedType !== 'all' || isFetchingData || isDeleting ? (
          <SessionsTable
            sessions={sessions}
            availableTypes={availableTypes}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            actions={sessionActions}
            initialLoading={initialLoading}
          />
        ) : (
          <SessionsEmptyState onAction={openNewSession} />
        )}

        {hasMore && sessions.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={loadMoreSessions}
              className="w-full md:w-auto h-9 px-6 rounded-xl font-semibold border-border/60 hover:bg-muted active:scale-95 transition-all text-muted-foreground hover:text-foreground"
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Chargement...' : 'Voir plus'}
            </Button>
          </div>
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
            <AlertDialogCancel data-testid="delete-session-cancel" onClick={() => setDeletingId(null)} className="rounded-xl px-6 active:scale-95 transition-all">Annuler</AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-session-confirm"
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-6 font-bold active:scale-95 transition-all"
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