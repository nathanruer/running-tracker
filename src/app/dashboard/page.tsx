'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Edit, Plus, Trash2, User as UserIcon, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

import SessionDialog from '@/components/session-dialog';
import { StravaImportDialog } from '@/components/strava-import-dialog';
import { CsvImportDialog } from '@/components/csv-import-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  deleteSession,
  getCurrentUser,
  getSessions,
  logoutUser,
  getSessionTypes,
  bulkImportSessions,
  type TrainingSession,
  type TrainingSessionPayload,
  type User,
} from '@/lib/api';

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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
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
      const defaultTypes = ['Footing', 'Sortie longue', 'Fractionné'];
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

  const handleDialogClose = async () => {
    setIsDialogOpen(false);
    setEditingSession(null);
    setImportedData(null);
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  const handleStravaImport = (data: any) => {
    setImportedData(data);
    setIsDialogOpen(true);
  };

  const handleRequestStravaImport = () => {
    setIsStravaDialogOpen(true);
  };

  const handleCsvImport = async (sessions: TrainingSessionPayload[]) => {
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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortedSessions = () => {
    if (!sortColumn || !sortDirection) {
      return sessions;
    }

    return [...sessions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'sessionNumber':
          aValue = a.sessionNumber;
          bValue = b.sessionNumber;
          break;
        case 'week':
          aValue = a.week;
          bValue = b.week;
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'sessionType':
          aValue = a.sessionType.toLowerCase();
          bValue = b.sessionType.toLowerCase();
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'distance':
          aValue = a.distance;
          bValue = b.distance;
          break;
        case 'avgPace':
          aValue = a.avgPace;
          bValue = b.avgPace;
          break;
        case 'avgHeartRate':
          aValue = a.avgHeartRate;
          bValue = b.avgHeartRate;
          break;
        case 'perceivedExertion':
          aValue = a.perceivedExertion ?? 0;
          bValue = b.perceivedExertion ?? 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="mr-2 h-4 w-4" />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="mr-2 h-4 w-4 text-foreground" />;
    }
    return <ChevronUp className="mr-2 h-4 w-4 text-foreground" />;
  };



  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gradient">Running Tracker</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="gradient-violet"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle séance
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/profile')}
              onMouseEnter={() => {
                queryClient.prefetchQuery({
                  queryKey: ['user'],
                  queryFn: getCurrentUser,
                  staleTime: 10 * 60 * 1000,
                });
                queryClient.prefetchQuery({
                  queryKey: ['sessions', 'all'],
                  queryFn: () => getSessions(),
                  staleTime: 5 * 60 * 1000,
                });
              }}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Profil
            </Button>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="flex flex-col gap-4 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl font-bold">Historique des séances</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={selectedType}
                onValueChange={setSelectedType}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Type de séance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={viewMode}
                onValueChange={(value: 'paginated' | 'all') => setViewMode(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Affichage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paginated">10 dernières</SelectItem>
                  <SelectItem value="all">Tout afficher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {initialLoading || sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">#</TableHead>
                      <TableHead className="w-20 text-center">Semaine</TableHead>
                      <TableHead className="text-center">Date</TableHead>
                      <TableHead className="text-center">Séance</TableHead>
                      <TableHead className="text-center">
                        <button 
                          onClick={() => handleSort('duration')}
                          className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                        >
                          <SortIcon column="duration" />
                          <span className={sortColumn === 'duration' ? 'text-foreground' : ''}>Durée</span>
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button 
                          onClick={() => handleSort('distance')}
                          className="flex items-center justify-center hover:text-foreground transition-colors w-full"
                        >
                          <SortIcon column="distance" />
                          <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Distance</span>
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleSort('avgPace')}
                            className="flex items-center hover:text-foreground transition-colors"
                          >
                            <SortIcon column="avgPace" />
                            <span className={sortColumn === 'avgPace' ? 'text-foreground' : ''}>Allure</span>
                          </button>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Footing/SL : Allure moyenne
                                  <br />
                                  Fractionné : Allure cible pendant l'effort
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleSort('avgHeartRate')}
                            className="flex items-center hover:text-foreground transition-colors"
                          >
                            <SortIcon column="avgHeartRate" />
                            <span className={sortColumn === 'avgHeartRate' ? 'text-foreground' : ''}>FC</span>
                          </button>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">
                                  Footing/SL : FC moyenne
                                  <br />
                                  Fractionné : FC cible pendant l'effort
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <button 
                          onClick={() => handleSort('perceivedExertion')}
                          className="flex items-center justify-center w-full hover:text-foreground transition-colors"
                        >
                          <SortIcon column="perceivedExertion" />
                          <span className={sortColumn === 'perceivedExertion' ? 'text-foreground' : ''}>RPE</span>
                        </button>
                      </TableHead>
                      <TableHead>Commentaires</TableHead>
                      <TableHead className="w-24 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-6 w-8 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell><div className="h-6 w-12 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell><div className="h-6 w-24 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-center">
                              <div className="h-5 w-24 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                              <div className="h-3 w-16 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                            </div>
                          </TableCell>
                          <TableCell><div className="h-6 w-16 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell><div className="h-6 w-20 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell><div className="h-6 w-16 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell><div className="h-6 w-16 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell><div className="h-6 w-12 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell><div className="h-10 w-full animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              <div className="h-8 w-8 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                              <div className="h-8 w-8 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      getSortedSessions().map((session) => (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium text-center">
                            {session.sessionNumber}
                          </TableCell>
                          <TableCell className="text-center">{session.week}</TableCell>
                          <TableCell className="text-center">
                            {new Date(session.date).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col gap-0.5 items-center">
                              <span>{session.sessionType}</span>
                              {session.intervalStructure && (
                                <span className="text-xs text-gradient">
                                  {session.intervalStructure}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{session.duration}</TableCell>
                          <TableCell className="text-center">{session.distance.toFixed(2)} km</TableCell>
                          <TableCell className="text-center">{session.avgPace}</TableCell>
                          <TableCell className="text-center">{session.avgHeartRate} bpm</TableCell>
                          <TableCell className="text-center">
                            {session.perceivedExertion ? (
                              <span className={
                                session.perceivedExertion <= 3 ? 'text-green-500' :
                                session.perceivedExertion <= 6 ? 'text-yellow-500' :
                                session.perceivedExertion <= 8 ? 'text-orange-500' :
                                'text-red-500 font-bold'
                              }>
                                {session.perceivedExertion}/10
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[200px] max-w-[400px]">
                            <p className="whitespace-normal break-words text-sm text-muted-foreground">
                              {session.comments}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(session)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(session.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <p className="mb-4">Aucune séance enregistrée</p>
                <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter votre première séance
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
        onOpenChange={setIsDialogOpen}
        onClose={handleDialogClose}
        session={editingSession}
        initialData={importedData}

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
      />

      <StravaImportDialog
        open={isStravaDialogOpen}
        onOpenChange={setIsStravaDialogOpen}
        onImport={handleStravaImport}
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