'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import SessionDialog from '@/features/sessions/components/session-dialog';
import { StravaImportDialog } from '@/features/import/components/strava-import-dialog';
import { CsvImportDialog } from '@/features/import/components/csv-import-dialog';
import { SessionsTable } from '@/features/dashboard/components/sessions-table';
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
import { useSessionMutations } from '@/features/sessions/hooks/use-session-mutations';
import {
  getCurrentUser,
  getSessions,
  getSessionTypes,
  bulkImportSessions,
} from '@/lib/services/api-client';
import {
  type TrainingSession,
  type TrainingSessionPayload,
} from '@/lib/types';
import { parseIntervalStructure } from '@/lib/utils';

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
  const [importedData, setImportedData] = useState<TrainingSessionPayload | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  const { handleDelete: deleteMutation, handleBulkDelete, handleSessionSuccess, isDeleting } =
    useSessionMutations(selectedType);

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

  const { data: availableTypes = [] } = useQuery({
    queryKey: ['sessionTypes'],
    queryFn: async () => {
      const types = await getSessionTypes();
      return types.sort();
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

  useEffect(() => {
    if (selectedType !== 'all' && availableTypes.length > 0 && !availableTypes.includes(selectedType)) {
      setSelectedType('all');
    }
  }, [availableTypes, selectedType]);

  if (!user && !userLoading) {
    return null;
  }

  if (showGlobalLoading) {
    return (
      <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
        <div className="mx-auto max-w-[90rem]">
          <h1 className="text-4xl font-bold text-gradient mb-6 md:hidden">Dashboard</h1>

          <SessionsTable
            sessions={[]}
            availableTypes={[]}
            selectedType="all"
            onTypeChange={() => {}}
            viewMode="paginated"
            onViewModeChange={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            onBulkDelete={async () => {}}
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

  const handleCsvImport = async (sessions: Array<{
    date: string;
    sessionType: string;
    duration: string;
    distance: number;
    avgPace: string;
    avgHeartRate: number;
    perceivedExertion?: number;
    comments: string;
    intervalDetails?: string | null;
  }>) => {
    if (getDialogMode() === 'complete') {
      if (sessions.length > 0) {
        const session = sessions[0];
        setImportedData({
          date: session.date,
          sessionType: session.sessionType,
          duration: session.duration,
          distance: session.distance,
          avgPace: session.avgPace,
          avgHeartRate: session.avgHeartRate,
          perceivedExertion: session.perceivedExertion,
          comments: session.comments,
          intervalDetails: session.intervalDetails ? parseIntervalStructure(session.intervalDetails) : null,
        });
        setIsCsvDialogOpen(false);
        setIsDialogOpen(true);
      }
      return;
    }

    setIsImportingCsv(true);
    try {
      const convertedSessions = sessions.map(session => ({
        date: session.date,
        sessionType: session.sessionType,
        duration: session.duration,
        distance: session.distance,
        avgPace: session.avgPace,
        avgHeartRate: session.avgHeartRate,
        perceivedExertion: session.perceivedExertion,
        comments: session.comments,
        intervalDetails: session.intervalDetails ? parseIntervalStructure(session.intervalDetails) : null,
      }));
      await bulkImportSessions(convertedSessions);
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
      console.error('Import error:', error);

      let errorMessage = 'Erreur lors de l\'import';
      if (error instanceof Error) {
        errorMessage = error.message;

        const errorData = (error as Error & { details?: Array<{ path: string; message: string }> }).details;
        if (errorData && Array.isArray(errorData)) {
          const details = errorData.map((d) => `${d.path}: ${d.message}`).join('\n');
          console.error('Validation errors:', details);
          errorMessage += '\n' + details;
        }
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
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
    <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
      <div className="mx-auto max-w-[90rem]">
        <h1 className="text-4xl font-bold text-gradient mb-6 md:hidden">Dashboard</h1>

        {initialLoading || sessions.length > 0 || selectedType !== 'all' || isFetchingData || isDeleting ? (
          <SessionsTable
            sessions={sessions}
            availableTypes={availableTypes}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onEdit={handleEdit}
            onDelete={setDeletingId}
            onBulkDelete={handleBulkDelete}
            onNewSession={openNewSession}
            initialLoading={initialLoading}
          />
        ) : (
          <div className="rounded-lg border border-border/50 bg-card p-12 text-center text-muted-foreground">
            <p className="mb-4">Aucune séance enregistrée</p>
            <Button onClick={openNewSession} variant="outline">
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
        onSuccess={handleSessionSuccess}
        session={editingSession}
        initialData={importedData ? {
          ...importedData,
          date: importedData.date ?? undefined,
          duration: importedData.duration ?? undefined,
          avgPace: importedData.avgPace ?? undefined,
        } : null}
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
        queryClient={queryClient}
        onBulkImportSuccess={() => {
          setIsDialogOpen(false);
          setEditingSession(null);
          setImportedData(null);
        }}
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