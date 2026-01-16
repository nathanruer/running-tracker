'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { type QueryClient } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { bulkImportSessions, getStravaActivityDetails, type StravaActivityDetails } from '@/lib/services/api-client';
import { useStravaActivities, type StravaActivity } from '../hooks/use-strava-activities';
import { useTableSort } from '@/hooks/use-table-sort';
import { useTableSelection } from '@/hooks/use-table-selection';
import { useApiErrorHandler } from '@/hooks/use-api-error-handler';
import { formatDuration } from '@/lib/utils/duration';
import { calculatePaceString } from '@/lib/utils/pace';
import { StravaBadge } from './strava-badge';

interface StravaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: StravaActivityDetails) => void;
  mode?: 'create' | 'edit' | 'complete';
  queryClient?: QueryClient;
  onBulkImportSuccess?: () => void;
}

export function StravaImportDialog({
  open,
  onOpenChange,
  onImport,
  mode = 'create',
  queryClient,
  onBulkImportSuccess,
}: StravaImportDialogProps) {
  const [importing, setImporting] = useState(false);

  const { activities, loading, isConnected, connectToStrava, loadMore, hasMore, isFetchingMore } = useStravaActivities(open);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isFetchingMore || !isConnected) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isFetchingMore, isConnected, loadMore]);
  const { handleError, handleSuccess, handleWarning } = useApiErrorHandler();
  const { handleSort, SortIcon, defaultComparator, sortColumn } = useTableSort<StravaActivity>(
    activities,
    null,
    null
  );
  const {
    selectedIndices,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useTableSelection(activities, mode === 'complete' ? 'single' : 'multiple');

  const sortedActivities = defaultComparator((activity: StravaActivity, column: string) => {
    switch (column) {
      case 'date':
        return new Date(activity.start_date_local);
      case 'distance':
        return activity.distance;
      case 'duration':
        return activity.moving_time;
      case 'pace':
        return activity.distance > 0 ? activity.moving_time / (activity.distance / 1000) : 999999;
      case 'heartRate':
        return activity.average_heartrate || 0;
      default:
        return '';
    }
  });

  const handleImportSelected = async () => {
    if (selectedIndices.size === 0) {
      handleWarning('Veuillez sélectionner au moins une activité');
      return;
    }

    setImporting(true);
    try {
      const selectedActivities = Array.from(selectedIndices).map((i) => activities[i]);

      if (mode === 'complete') {
        const activity = selectedActivities[0];
        const data = await getStravaActivityDetails(activity.id.toString());
        onImport(data);
        onOpenChange(false);
        clearSelection();
      } else if (selectedIndices.size === 1) {
        const activity = selectedActivities[0];
        const data = await getStravaActivityDetails(activity.id.toString());
        onImport(data);
        onOpenChange(false);
        clearSelection();
      } else {
        const activityPromises = selectedActivities.map(async (activity) => {
          try {
            return await getStravaActivityDetails(activity.id.toString());
          } catch {
            return null;
          }
        });

        const fetchedActivities = (await Promise.all(activityPromises)).filter(Boolean) as StravaActivityDetails[];

        if (fetchedActivities.length === 0) {
          handleError(null, "Aucune activité n'a pu être récupérée depuis Strava");
          return;
        }

        const sessionsToImport = fetchedActivities.map((activity) => ({
          date: new Date(activity.date).toISOString().split('T')[0],
          sessionType: '-',
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
        }));

        const result = await bulkImportSessions(sessionsToImport);

        handleSuccess(
          'Import réussi',
          `${result.count} séance(s) Strava importée(s) avec succès`
        );

        onOpenChange(false);
        clearSelection();

        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
        }

        if (onBulkImportSuccess) {
          onBulkImportSuccess();
        }

        return;
      }
    } catch (error) {
      handleError(error, "Impossible d'importer les activités");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-hidden ${isConnected && activities.length > 0 ? 'sm:max-w-[900px]' : 'sm:max-w-[425px]'} rounded-xl border border-border/50 shadow-2xl p-0 bg-card/95 backdrop-blur-xl`}>
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className={cn("px-8 pt-8", !isConnected || activities.length === 0 ? "sr-only" : "")}>
            <DialogTitle className="text-2xl font-bold tracking-tight">Importer depuis Strava</DialogTitle>
            <DialogDescription className="text-base">
              {isConnected && activities.length > 0 ? (
                mode === 'complete'
                  ? 'Sélectionnez une activité à importer pour cette séance.'
                  : 'Sélectionnez une ou plusieurs activités à importer.'
              ) : (
                'Connectez votre compte Strava pour importer vos activités.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {!isConnected ? (
              <div className="flex flex-col items-center py-6 px-2 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FC4C02]/5 border border-[#FC4C02]/10 shadow-inner">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z"
                      fill="#FC4C02"
                    />
                    <path
                      d="M10.233 13.828L7.9 9.111H4.47l5.763 11.38 2.089-4.116-2.089-2.547z"
                      fill="#FC4C02"
                      opacity="0.6"
                    />
                    <path
                      d="M7.9 9.111l2.333 4.717 2.089 2.547 2.089-4.116h3.065L12 0 7.9 9.111z"
                      fill="#FC4C02"
                    />
                  </svg>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">Connexion à Strava</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    Connectez votre compte pour importer vos données d&apos;entraînement automatiquement.
                  </p>
                </div>

                <div className="w-full space-y-4">
                  <Button
                    onClick={connectToStrava}
                    className="w-full font-bold bg-[#FC4C02] hover:bg-[#E34402] text-white shadow-none active:scale-95 transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                  
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-30">
                      Sécurisé via OAuth 2.0
                    </p>
                    <StravaBadge variant="orange" className="scale-90 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500" />
                  </div>
                </div>
              </div>
            ) : loading || (activities.length === 0 && loading) ? (
                  <Loader2 className="h-10 w-10 animate-spin text-violet-600 relative z-10" />
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-6 animate-in fade-in duration-500">
                <div className="bg-muted/30 p-8 rounded-2xl border border-border/50 text-center space-y-3">
                  <p className="text-base font-bold">Aucune activité trouvée</p>
                  <p className="text-sm text-muted-foreground max-w-[200px]">
                    Nous n&apos;avons pas trouvé de séances de course récentes sur votre Strava.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
                    {activities.length} activités trouvées
                  </p>
                </div>
                
                <ScrollArea className="h-[400px] rounded-xl border border-border/40 bg-muted/20">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          {mode !== 'complete' && (
                            <Checkbox
                              checked={activities.length > 0 && isAllSelected()}
                              onCheckedChange={toggleSelectAll}
                            />
                          )}
                        </TableHead>
                        <TableHead className="text-center">
                          <button 
                            onClick={() => handleSort('date')}
                            className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                          >
                            <SortIcon column="date" />
                            <span className={sortColumn === 'date' ? 'text-foreground' : ''}>Date</span>
                          </button>
                        </TableHead>
                        <TableHead>Activité</TableHead>
                        <TableHead className="text-center">
                          <button 
                            onClick={() => handleSort('duration')}
                            className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                          >
                            <SortIcon column="duration" />
                            <span className={sortColumn === 'duration' ? 'text-foreground' : ''}>Durée</span>
                          </button>
                        </TableHead>
                        <TableHead className="text-center">
                          <button 
                            onClick={() => handleSort('distance')}
                            className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                          >
                            <SortIcon column="distance" />
                            <span className={sortColumn === 'distance' ? 'text-foreground' : ''}>Distance</span>
                          </button>
                        </TableHead>
                        <TableHead className="text-center">
                          <button
                            onClick={() => handleSort('pace')}
                            className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                          >
                            <SortIcon column="pace" />
                            <span className={sortColumn === 'pace' ? 'text-foreground' : ''}>Allure</span>
                          </button>
                        </TableHead>
                        <TableHead className="text-center">
                          <button 
                            onClick={() => handleSort('heartRate')}
                            className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full"
                          >
                            <SortIcon column="heartRate" />
                            <span className={sortColumn === 'heartRate' ? 'text-foreground' : ''}>FC moy</span>
                          </button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedActivities.map((activity) => {
                        const originalIndex = activities.findIndex((a) => a === activity);
                        return (
                          <TableRow
                            key={activity.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleSelect(originalIndex)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected(originalIndex)}
                                onCheckedChange={() => toggleSelect(originalIndex)}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-center text-muted-foreground/40 font-semibold tabular-nums">
                              {new Date(activity.start_date_local).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}
                            </TableCell>
                            <TableCell className="font-bold text-foreground/90">{activity.name}</TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold tabular-nums text-foreground/100">{formatDuration(activity.moving_time)}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-baseline justify-center gap-0.5 group/metric">
                                <span className="font-semibold tabular-nums text-foreground/100">{(activity.distance / 1000).toFixed(2)}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 group-hover/metric:text-muted-foreground/60 transition-colors">km</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-baseline justify-center gap-0.5 group/metric">
                                <span className="font-semibold tabular-nums text-foreground/100">{calculatePaceString(activity.distance, activity.moving_time)}</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 group-hover/metric:text-muted-foreground/60 transition-colors">/km</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {activity.average_heartrate ? (
                                <div className="flex items-baseline justify-center gap-0.5 group/metric">
                                  <span className="font-semibold tabular-nums text-foreground/100">{Math.round(activity.average_heartrate)}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 group-hover/metric:text-muted-foreground/60 transition-colors">bpm</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/20">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {hasMore && (
                    <div 
                      ref={observerTarget}
                      className="flex justify-center p-8 w-full min-h-[100px]"
                    >
                      {isFetchingMore && (
                        <div className="flex items-center gap-3 text-muted-foreground animate-in fade-in duration-300">
                            <Loader2 className="h-5 w-5 animate-spin text-violet-600 relative z-10" />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                            Synchronisation Strava...
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                <div className="flex gap-3 pt-6 border-t mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 font-bold active:scale-95 transition-all rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleImportSelected} 
                    className="flex-[2] font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-none active:scale-95 transition-all rounded-xl"
                    disabled={importing || selectedIndices.size === 0}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Import en cours...
                      </>
                    ) : (
                      `Importer ${selectedIndices.size} ${selectedIndices.size > 1 ? 'activités' : 'activité'}`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
