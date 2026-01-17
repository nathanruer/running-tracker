'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, X } from 'lucide-react';
import { type QueryClient } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
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
  const [searchQuery, setSearchQuery] = useState('');

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
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const lowerQuery = searchQuery.toLowerCase();
    return activities.filter((a) => a.name.toLowerCase().includes(lowerQuery));
  }, [activities, searchQuery]);

  const { handleSort, SortIcon, defaultComparator, sortColumn } = useTableSort<StravaActivity>(
    filteredActivities,
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

      if (mode === 'complete' || selectedIndices.size === 1) {
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
      }
    } catch (error) {
      handleError(error, "Impossible d'importer les activités");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className={cn(
        "max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-0 w-[95vw] rounded-2xl", 
        isConnected && activities.length > 0 ? "sm:max-w-[900px]" : "sm:max-w-[425px]"
      )}>
        <div className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className={cn("px-4 md:px-8 pt-6 md:pt-8", !isConnected || activities.length === 0 ? "sr-only" : "relative w-full items-start text-left")}>
            <div className="flex w-full items-start justify-between gap-4">
              <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight">Importer depuis Strava</DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-xl text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all shrink-0 -mt-1"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DialogDescription className="text-sm md:text-base text-muted-foreground/70 font-medium mt-1">
              {isConnected && activities.length > 0 ? (
                mode === 'complete'
                  ? 'Sélectionnez une activité à importer.'
                  : 'Sélectionnez vos activités Strava.'
              ) : (
                'Connectez votre compte Strava.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col">
            {!isConnected ? (
              <div className="flex flex-col items-center py-10 px-6 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#FC4C02]/20 blur-2xl rounded-full" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#FC4C02]/5 border border-[#FC4C02]/10 shadow-inner">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" fill="#FC4C02" />
                      <path d="M10.233 13.828L7.9 9.111H4.47l5.763 11.38 2.089-4.116-2.089-2.547z" fill="#FC4C02" opacity="0.6" />
                      <path d="M7.9 9.111l2.333 4.717 2.089 2.547 2.089-4.116h3.065L12 0 7.9 9.111z" fill="#FC4C02" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">Connexion à Strava</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    Connectez votre compte pour importer vos données d&apos;entraînement automatiquement.
                  </p>
                </div>

                <div className="w-full space-y-4">
                  <Button onClick={connectToStrava} variant="action" size="xl" className="w-full bg-[#FC4C02] hover:bg-[#E34402] transition-none" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter à Strava'}
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
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-violet-600 relative z-10" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
                <div className="px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-border/10 bg-muted/5">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Filtrer par nom..."
                    className="md:w-[320px]"
                  />
                  <div className="flex items-center bg-muted/5 border border-border/40 rounded-xl px-2.5 py-1.5 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/30 whitespace-nowrap">
                      {activities.length} {activities.length > 1 ? 'SÉANCES' : 'SÉANCE'}
                    </span>
                    {hasMore && (
                      <>
                        <div className="w-[1px] h-3 bg-border/40 mx-1.5" />
                        <button
                          onClick={loadMore}
                          disabled={isFetchingMore}
                          className="text-[9px] font-black uppercase tracking-widest text-violet-500/60 hover:text-violet-500 transition-colors disabled:opacity-50"
                        >
                          {isFetchingMore ? '...' : 'Synchroniser'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1 bg-muted/5">
                    <div className="min-w-full overflow-x-auto px-4 md:px-8 py-2">
                      <Table>
                        <TableHeader className="bg-transparent border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur-sm z-20">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[40px] md:w-[50px] py-4 px-2 md:px-4">
                              {mode !== 'complete' && (
                                <Checkbox
                                  checked={activities.length > 0 && isAllSelected()}
                                  onCheckedChange={toggleSelectAll}
                                  className="border-muted-foreground/30"
                                />
                              )}
                            </TableHead>
                            <TableHead className="text-center py-4 px-2 md:px-4">
                              <button onClick={() => handleSort('date')} className="flex items-center justify-center gap-1.5 hover:text-foreground transition-all w-full group">
                                <SortIcon column="date" />
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
                                  sortColumn === 'date' ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-foreground/80'
                                )}>Date</span>
                              </button>
                            </TableHead>
                            <TableHead className="py-4 px-2 md:px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Activité</TableHead>
                            <TableHead className="text-center py-4 px-2 md:px-4 hidden sm:table-cell">
                              <button onClick={() => handleSort('duration')} className="flex items-center justify-center gap-1.5 hover:text-foreground transition-all w-full group">
                                <SortIcon column="duration" />
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
                                  sortColumn === 'duration' ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-foreground/80'
                                )}>Durée</span>
                              </button>
                            </TableHead>
                            <TableHead className="text-center py-4 px-2 md:px-4">
                              <button onClick={() => handleSort('distance')} className="flex items-center justify-center gap-1.5 hover:text-foreground transition-all w-full group">
                                <SortIcon column="distance" />
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
                                  sortColumn === 'distance' ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-foreground/80'
                                )}>Dist.</span>
                              </button>
                            </TableHead>
                            <TableHead className="text-center py-4 px-2 md:px-4 hidden md:table-cell">
                              <button onClick={() => handleSort('pace')} className="flex items-center justify-center gap-1.5 hover:text-foreground transition-all w-full group">
                                <SortIcon column="pace" />
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
                                  sortColumn === 'pace' ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-foreground/80'
                                )}>Allure</span>
                              </button>
                            </TableHead>
                            <TableHead className="text-center py-4 px-2 md:px-4 hidden lg:table-cell">
                              <button onClick={() => handleSort('heartRate')} className="flex items-center justify-center gap-1.5 hover:text-foreground transition-all w-full group">
                                <SortIcon column="heartRate" />
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
                                  sortColumn === 'heartRate' ? 'text-foreground' : 'text-muted-foreground/60 group-hover:text-foreground/80'
                                )}>FC</span>
                              </button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedActivities.map((activity) => {
                            const originalIndex = activities.findIndex((a) => a === activity);
                            const selected = isSelected(originalIndex);
                            return (
                              <TableRow
                                key={activity.id}
                                className={cn(
                                  "cursor-pointer transition-colors group/row border-none",
                                  selected ? "bg-violet-500/5 hover:bg-violet-500/10" : "hover:bg-muted/30"
                                )}
                                onClick={() => toggleSelect(originalIndex)}
                              >
                                <TableCell className="py-3 md:py-4 px-2 md:px-4" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={() => toggleSelect(originalIndex)}
                                    className={cn(
                                      "transition-all duration-300",
                                      selected 
                                        ? "border-violet-500/50 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500" 
                                        : "border-muted-foreground/30"
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-center text-muted-foreground/50 font-medium tabular-nums text-[11px] md:text-[13px] tracking-tight py-3 md:py-4 px-2 md:px-4">
                                  {new Date(activity.start_date_local).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}
                                </TableCell>
                                <TableCell className="font-bold text-foreground/90 py-3 md:py-4 px-2 md:px-4 truncate max-w-[120px] md:max-w-[200px] text-xs md:text-sm">{activity.name}</TableCell>
                                <TableCell className="text-center py-3 md:py-4 px-2 md:px-4 hidden sm:table-cell">
                                  <span className="font-medium tabular-nums text-foreground/100 text-sm md:text-[15px] tracking-tight">{formatDuration(activity.moving_time)}</span>
                                </TableCell>
                                <TableCell className="text-center py-3 md:py-4 px-2 md:px-4">
                                  <div className="flex items-baseline justify-center">
                                    <span className="font-medium tabular-nums text-foreground/100 text-sm md:text-[15px] tracking-tight">{(activity.distance / 1000).toFixed(2)}</span>
                                    <span className="ml-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">km</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-3 md:py-4 px-2 md:px-4 hidden md:table-cell">
                                  <div className="flex items-baseline justify-center">
                                    <span className="font-medium tabular-nums text-foreground/100 text-sm md:text-[15px] tracking-tight">{calculatePaceString(activity.distance, activity.moving_time)}</span>
                                    <span className="ml-0.5 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">/km</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center py-3 md:py-4 px-2 md:px-4 hidden lg:table-cell">
                                  {activity.average_heartrate ? (
                                    <div className="flex items-baseline justify-center">
                                      <span className="font-medium tabular-nums text-foreground/100 text-sm md:text-[15px] tracking-tight">{Math.round(activity.average_heartrate)}</span>
                                      <span className="ml-0.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">bpm</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/10 text-[15px]">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {hasMore && (
                      <div ref={observerTarget} className="flex flex-col items-center justify-center p-8 w-full min-h-[120px] gap-4">
                        {isFetchingMore ? (
                          <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in duration-300">
                            <div className="relative">
                              <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse" />
                              <Loader2 className="h-6 w-6 animate-spin text-violet-600 relative z-10" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600/60">
                              Synchronisation Strava...
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 group animate-in fade-in slide-in-from-bottom-2 duration-700">
                            <div className="h-8 w-[1px] bg-gradient-to-b from-transparent via-violet-500/20 to-transparent" />
                            <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] group-hover:text-violet-500/50 transition-colors">
                              Défilez pour charger plus
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!hasMore && activities.length > 0 && (
                      <div className="flex justify-center p-12 w-full opacity-20">
                         <div className="flex flex-col items-center gap-2">
                           <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                           <span className="text-[9px] font-black uppercase tracking-[0.3em]">Fin de l&apos;historique</span>
                         </div>
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 p-4 md:p-8 border-t border-border/40 bg-background/50 backdrop-blur-sm">
                  <Button
                    type="button"
                    variant="neutral"
                    size="xl"
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:flex-1 transition-none text-xs md:text-sm font-bold"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleImportSelected} 
                    variant="action"
                    size="xl"
                    className="w-full sm:flex-[2] px-4 md:px-8 font-black shadow-lg shadow-violet-500/10 text-xs md:text-sm"
                    disabled={importing || selectedIndices.size === 0}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
