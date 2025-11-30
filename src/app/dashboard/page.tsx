'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import SessionDialog from '@/components/session-dialog';
import { StravaImportDialog } from '@/components/strava-import-dialog';
import { CsvImportDialog } from '@/components/csv-import-dialog';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SessionsTable } from '@/components/dashboard/sessions-table';
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
import {
  deleteSession,
  getCurrentUser,
  getSessions,
  getSessionTypes,
  bulkImportSessions,
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
  const [isStravaDialogOpen, setIsStravaDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [importedData, setImportedData] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: availableTypes = [] } = useQuery({
    queryKey: ['sessionTypes'],
    queryFn: async () => {
      const types = await getSessionTypes();
      const defaultTypes = ['Footing', 'Sortie longue', 'Fractionné', 'Autre'];
      return Array.from(new Set([...defaultTypes, ...types])).sort();
    },
    staleTime: 15 * 60 * 1000,
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

  const initialLoading = userLoading || (
    !sessions.length && (
      viewMode === 'all' ? allSessionsLoading : paginatedSessionsLoading
    )
  );
  const isFetchingData = viewMode === 'all' ? allSessionsFetching : paginatedSessionsFetching;
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

  if (showGlobalLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">Chargement de vos performances...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setDeletingId(null);
      toast({
        title: 'Séance supprimée',
        description: 'La séance a été supprimée avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (session: TrainingSession) => {
    setEditingSession(session);
    setIsDialogOpen(true);
  };

  const getDialogMode = () => {
    if (!editingSession) return 'create';
    return editingSession.status === 'planned' ? 'complete' : 'edit';
  };

  const handleDialogClose = async () => {
    setIsDialogOpen(false);
    setEditingSession(null);
    setImportedData(null);
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingSession(null);
      setImportedData(null);
    }
    setIsDialogOpen(open);
  };

  const handleStravaImport = (data: any) => {
    setImportedData(data);
    setIsDialogOpen(true);
  };

  const handleRequestStravaImport = () => {
    setIsStravaDialogOpen(true);
  };

  const handleCsvImport = async (sessions: TrainingSessionPayload[]) => {
    // En mode 'complete', utiliser les données de la première séance pour pré-remplir le formulaire
    if (getDialogMode() === 'complete') {
      if (sessions.length > 0) {
        setImportedData(sessions[0]);
        setIsCsvDialogOpen(false);
        setIsDialogOpen(true);
      }
      return;
    }

    // En mode 'create', importer toutes les séances en masse
    setIsImportingCsv(true);
    try {
      await bulkImportSessions(sessions);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessionTypes'] });

      setIsCsvDialogOpen(false);
      setIsDialogOpen(false);

      setEditingSession(null);
      setImportedData(null);

      toast({
        title: 'Import réussi',
        description: `${sessions.length} séance(s) importée(s) avec succès.`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error
            ? error.message
            : 'Erreur lors de l\'import',
        variant: 'destructive',
      });
    } finally {
      setIsImportingCsv(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader onNewSession={() => {
          setEditingSession(null);
          setIsDialogOpen(true);
        }} />

        {initialLoading || sessions.length > 0 ? (
          <SessionsTable
            sessions={sessions}
            availableTypes={availableTypes}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onEdit={handleEdit}
            onDelete={setDeletingId}
            initialLoading={initialLoading}
          />
        ) : (
          <div className="rounded-lg border border-border/50 bg-card p-12 text-center text-muted-foreground">
            <p className="mb-4">Aucune séance enregistrée</p>
            <Button onClick={() => {
              setEditingSession(null);
              setIsDialogOpen(true);
            }} variant="outline">
              Ajouter votre première séance
            </Button>
          </div>
        )}

        {hasMore && sessions.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={loadMoreSessions}
              className="w-full md:w-auto"
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
        session={editingSession}
        initialData={importedData}
        mode={getDialogMode()}
        onRequestStravaImport={handleRequestStravaImport}
        onRequestCsvImport={() => {
          setIsCsvDialogOpen(true);
        }}
      />

      <CsvImportDialog
        open={isCsvDialogOpen}
        onOpenChange={setIsCsvDialogOpen}
        onImport={handleCsvImport}
        isImporting={isImportingCsv}
        mode={getDialogMode()}
      />

      <StravaImportDialog
        open={isStravaDialogOpen}
        onOpenChange={setIsStravaDialogOpen}
        onImport={handleStravaImport}
        mode={getDialogMode()}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardPage;