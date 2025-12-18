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
  bulkDeleteSessions,
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
  const [isDeleting, setIsDeleting] = useState(false);
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
    const previousAllData = queryClient.getQueryData(['sessions', 'all', selectedType]);
    const previousPaginatedData = queryClient.getQueryData(['sessions', 'paginated', selectedType]);
    
    await queryClient.cancelQueries({ queryKey: ['sessions'] });
    
    queryClient.setQueryData(['sessions', 'all', selectedType], (old: TrainingSession[] | undefined) => 
      old?.filter(s => s.id !== id)
    );
    
    queryClient.setQueryData(['sessions', 'paginated', selectedType], (old: InfiniteData<TrainingSession[]> | undefined) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map(page => page.filter(s => s.id !== id)),
      };
    });

    if (selectedType !== 'all') {
      queryClient.setQueryData(['sessions', 'all', 'all'], (old: TrainingSession[] | undefined) => 
        old?.filter(s => s.id !== id)
      );
      queryClient.setQueryData(['sessions', 'paginated', 'all'], (old: InfiniteData<TrainingSession[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => page.filter(s => s.id !== id)),
        };
      });
    }
    
    setDeletingId(null);
    setIsDeleting(true);
    toast({
      title: 'Séance supprimée',
      description: 'La séance a été supprimée avec succès.',
    });
    
    try {
      await deleteSession(id);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessionTypes'] });
    } catch (error) {
      queryClient.setQueryData(['sessions', 'all', selectedType], previousAllData);
      queryClient.setQueryData(['sessions', 'paginated', selectedType], previousPaginatedData);
      toast({
        title: 'Erreur',
        description:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la suppression',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    const previousAllData = queryClient.getQueryData(['sessions', 'all', selectedType]);
    const previousPaginatedData = queryClient.getQueryData(['sessions', 'paginated', selectedType]);
    
    await queryClient.cancelQueries({ queryKey: ['sessions'] });

    queryClient.setQueryData(['sessions', 'all', selectedType], (old: TrainingSession[] | undefined) => 
      old?.filter(s => !ids.includes(s.id))
    );
    
    queryClient.setQueryData(['sessions', 'paginated', selectedType], (old: InfiniteData<TrainingSession[]> | undefined) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map(page => page.filter(s => !ids.includes(s.id))),
      };
    });

    if (selectedType !== 'all') {
      queryClient.setQueryData(['sessions', 'all', 'all'], (old: TrainingSession[] | undefined) => 
        old?.filter(s => !ids.includes(s.id))
      );
      queryClient.setQueryData(['sessions', 'paginated', 'all'], (old: InfiniteData<TrainingSession[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => page.filter(s => !ids.includes(s.id))),
        };
      });
    }

    try {
      setIsDeleting(true);
      await bulkDeleteSessions(ids);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessionTypes'] });
      toast({
        title: 'Séances supprimées',
        description: `${ids.length} séances ont été supprimées avec succès.`,
      });
    } catch (error) {
      queryClient.setQueryData(['sessions', 'all', selectedType], previousAllData);
      queryClient.setQueryData(['sessions', 'paginated', selectedType], previousPaginatedData);
      toast({
        title: 'Erreur',
        description:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la suppression groupée',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
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

  const handleSessionSuccess = (savedSession: TrainingSession) => {
    queryClient.setQueryData(['sessions', 'all', selectedType], (old: TrainingSession[] | undefined) => {
      if (!old) return [savedSession];
      
      const exists = old.find(s => s.id === savedSession.id);
      if (exists) {
        return old.map(s => s.id === savedSession.id ? savedSession : s);
      } else {
        return [savedSession, ...old].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
      }
    });

    queryClient.setQueryData(['sessions', 'paginated', selectedType], (old: InfiniteData<TrainingSession[]> | undefined) => {
      if (!old) return old;
      
      const newPages = old.pages.map(page => {
        const index = page.findIndex(s => s.id === savedSession.id);
        if (index !== -1) {
          const newPage = [...page];
          newPage[index] = savedSession;
          return newPage;
        }
        return page;
      });

      const existsInPages = old.pages.some(p => p.some(s => s.id === savedSession.id));
      if (!existsInPages && newPages.length > 0) {
        newPages[0] = [savedSession, ...newPages[0]];
      }

      return { ...old, pages: newPages };
    });

    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['sessionTypes'] });
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <DashboardHeader onNewSession={openNewSession} />

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