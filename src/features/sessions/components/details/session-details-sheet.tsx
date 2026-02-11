'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatCard } from '@/components/ui/stat-card';
import { ExternalLink, Map, Calendar, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import type { TrainingSession } from '@/lib/types';
import { decodePolyline, coordinatesToSVG } from '@/lib/utils/geo/polyline';
import { cn } from '@/lib/utils/cn';
import { validateStravaData } from '@/lib/validation/strava';
import { MAP_DIMENSIONS } from '@/lib/constants/map';
import dynamic from 'next/dynamic';

const LeafletRoute = dynamic(
  () => import('./leaflet-route').then((mod) => mod.LeafletRoute),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted/10 animate-pulse" />
  }
);

import { EnvironmentCard } from './environment-card';
import { StreamsSection } from './streams-section';
import { formatCadence } from '@/lib/utils/strava/cadence';
import { normalizeDurationFormat, formatDuration } from '@/lib/utils/duration';
import { calculateIntervalTotals } from '@/lib/utils/intervals';
import { IntervalDetailsView } from '@/features/dashboard/components/interval-details-view';
import { isPlanned } from '@/lib/domain/sessions/session-selectors';
import { Button } from '@/components/ui/button';
import { enrichSessionStreams, enrichSessionWeather, getSessionById } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';
import { useErrorHandler } from '@/hooks/use-error-handler';

interface SessionDetailsSheetProps {
  session: TrainingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionUpdated?: (session: TrainingSession) => void;
}

function formatStreamSuccessMessage(streams: TrainingSession['stravaStreams'] | null | undefined): string {
  if (!streams || typeof streams !== 'object') {
    return 'Les streams disponibles ont été ajoutés à votre séance.';
  }

  const labels: string[] = [];
  if ('velocity_smooth' in streams) labels.push('allure');
  if ('altitude' in streams) labels.push('altitude');
  if ('heartrate' in streams) labels.push('fréquence cardiaque');
  if ('cadence' in streams) labels.push('cadence');

  if (labels.length === 0) {
    return 'Les streams disponibles ont été ajoutés à votre séance.';
  }

  if (labels.length === 1) {
    return `Stream ajouté: ${labels[0]}.`;
  }

  const last = labels[labels.length - 1];
  const first = labels.slice(0, -1).join(', ');
  return `Streams ajoutés: ${first} et ${last}.`;
}

export function SessionDetailsSheet({
  session,
  open,
  onOpenChange,
  onSessionUpdated,
}: SessionDetailsSheetProps) {
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [isEnrichingWeather, setIsEnrichingWeather] = useState(false);
  const [isEnrichingStreams, setIsEnrichingStreams] = useState(false);
  const queryClient = useQueryClient();
  const { handleError, handleInfo, handleSuccess } = useErrorHandler({ scope: 'local' });

  if (!session) return null;

  const stravaData = validateStravaData(session.stravaData);
  const polyline = stravaData?.map?.summary_polyline;
  const decodedCoordinates = polyline ? decodePolyline(polyline) : [];
  const mapPath = polyline
    ? coordinatesToSVG(
        decodedCoordinates,
        MAP_DIMENSIONS.WIDTH,
        MAP_DIMENSIONS.HEIGHT
      ).path
    : null;

  const isPlannedSession = isPlanned(session);
  const hasStravaData = session.source === 'strava' && stravaData !== null;
  const hasRoute = decodedCoordinates.length > 0 && mapPath;
  const canEnrichWeather = !isPlannedSession && hasStravaData && hasRoute && !session.weather;
  const canEnrichStreams = !isPlannedSession
    && hasStravaData
    && !!session.externalId
    && session.hasStreams !== true;

  const totals = calculateIntervalTotals(session.intervalDetails?.steps);

  const displayDistance = session.distance
    ? session.distance
    : totals.totalDistanceKm > 0
    ? totals.totalDistanceKm
    : session.targetDistance || null;

  const displayDuration = session.duration
    ? session.duration
    : totals.totalDurationMin > 0
    ? formatDuration(totals.totalDurationMin * 60)
    : session.targetDuration
    ? formatDuration(session.targetDuration * 60)
    : null;

  const displayPace = session.avgPace
    ? session.avgPace
    : totals.avgPaceFormatted
    ? totals.avgPaceFormatted
    : session.targetPace || null;

  const displayHR = session.avgHeartRate
    ? session.avgHeartRate
    : totals.avgBpm
    ? totals.avgBpm
    : session.targetHeartRateBpm || null;

  const handleEnrichWeather = async () => {
    if (!canEnrichWeather || isEnrichingWeather) return;
    setIsEnrichingWeather(true);
    try {
      const result = await enrichSessionWeather(session.id);
      if (result.status === 'already_has_weather') {
        handleInfo('Météo déjà à jour', 'Cette séance dispose déjà des données météo les plus récentes.');
        return;
      }
      if (result.status === 'enriched' || result.status === 'updated') {
        let updatedSession = result.session ?? null;
        if (!updatedSession || !('userId' in updatedSession)) {
          updatedSession = await queryClient.fetchQuery({
            queryKey: queryKeys.sessionById(session.id),
            queryFn: () => getSessionById(session.id),
          });
        }
        if (updatedSession && 'id' in updatedSession) {
          queryClient.setQueryData(queryKeys.sessionById(updatedSession.id), updatedSession);
          onSessionUpdated?.(updatedSession as TrainingSession);
        }
        handleSuccess('Météo récupérée !', 'Les conditions météo ont été ajoutées à votre séance.');
        return;
      }
      handleInfo('Météo non disponible', 'Nous n’avons pas pu récupérer les données météo pour cette séance.');
    } catch (error) {
      handleError(error, 'Impossible de récupérer la météo.');
    } finally {
      setIsEnrichingWeather(false);
    }
  };

  const handleEnrichStreams = async () => {
    if (!canEnrichStreams || isEnrichingStreams) return;
    setIsEnrichingStreams(true);
    try {
      const result = await enrichSessionStreams(session.id);
      if (result.status === 'already_has_streams') {
        handleInfo('Streams déjà à jour', 'Cette séance dispose déjà de ses streams Strava.');
        return;
      }
      if (result.status === 'no_streams') {
        let updatedSession = result.session ?? null;
        if (!updatedSession || !('userId' in updatedSession)) {
          updatedSession = await queryClient.fetchQuery({
            queryKey: queryKeys.sessionById(session.id),
            queryFn: () => getSessionById(session.id),
          });
        }
        if (updatedSession && 'id' in updatedSession) {
          queryClient.setQueryData(queryKeys.sessionById(updatedSession.id), updatedSession);
          onSessionUpdated?.(updatedSession as TrainingSession);
        }
        handleInfo('Aucun stream disponible', 'Strava ne fournit pas de streams exploitables pour cette activité.');
        return;
      }
      if (result.status === 'enriched') {
        let updatedSession = result.session ?? null;
        if (!updatedSession || !('userId' in updatedSession)) {
          updatedSession = await queryClient.fetchQuery({
            queryKey: queryKeys.sessionById(session.id),
            queryFn: () => getSessionById(session.id),
          });
        }
        if (updatedSession && 'id' in updatedSession) {
          queryClient.setQueryData(queryKeys.sessionById(updatedSession.id), updatedSession);
          onSessionUpdated?.(updatedSession as TrainingSession);
        }
        const streamMessage = formatStreamSuccessMessage(
          (updatedSession as TrainingSession | null)?.stravaStreams ?? null
        );
        handleSuccess('Streams récupérés !', streamMessage);
        return;
      }
      handleInfo('Streams non disponibles', 'Nous n’avons pas pu récupérer les streams Strava pour cette séance.');
    } catch (error) {
      handleError(error, 'Impossible de récupérer les streams Strava.');
    } finally {
      setIsEnrichingStreams(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg lg:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col [&>button]:z-50">
          <ScrollArea className="flex-1">
            <div className="relative isolate overflow-hidden">
              {hasRoute ? (
                <div className="h-80 w-full flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-20" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-from)_0%,transparent_70%)] from-primary/10 opacity-50 z-10" />
                  <svg
                    viewBox={`0 0 ${MAP_DIMENSIONS.WIDTH} ${MAP_DIMENSIONS.HEIGHT}`}
                    className="w-full h-full stroke-primary fill-none stroke-[3] z-10 opacity-90 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                  >
                    <path d={mapPath} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div className="h-40 w-full bg-gradient-to-br from-primary/10 via-background to-background p-8 flex items-end">
                   <div className="flex items-center gap-3 text-primary/80">
                      <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                     <span className="text-xs font-black uppercase tracking-[0.2em]">{isPlannedSession ? 'Séance recommandée' : 'Séance complétée'}</span>
                   </div>
                </div>
              )}
              
              <div className={cn(
                "px-8 pb-6",
                hasRoute 
                  ? "absolute bottom-0 left-0 right-0 z-30 pt-12" 
                  : "pt-6"
              )}>
                <SheetHeader className="text-left space-y-4">
                  {session.sessionType && (
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={isPlannedSession ? "outline" : "secondary"} 
                        className={cn(
                          "h-6 px-3 text-[10px] uppercase font-bold tracking-widest bg-background/60 backdrop-blur-md border border-border/40 pointer-events-none rounded-full",
                          isPlannedSession && "border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]"
                        )}
                      >
                        {session.sessionType}
                      </Badge>
                    </div>
                  )}
                  <SheetTitle className="text-4xl font-black tracking-tighter leading-[0.9] text-foreground drop-shadow-sm">
                    {session.date 
                      ? new Date(session.date).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        }).split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
                      : 'Séance à planifier'
                    }
                  </SheetTitle>
                <div className="flex items-center justify-between w-full pt-2">
                  {hasStravaData && session.externalId ? (
                    <a 
                      href={`https://www.strava.com/activities/${session.externalId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all duration-300"
                    >
                      <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </div>
                      Voir sur Strava
                    </a>
                  ) : <div></div>}
                  {hasRoute && (
                    <button
                      onClick={() => setMapDialogOpen(true)}
                      className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-300"
                    >
                      <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-foreground/5 transition-colors">
                        <Map className="w-3 h-3" />
                      </div>
                      Agrandir
                    </button>
                  )}
                </div>
                </SheetHeader>
              </div>
            </div>

            <div className="px-8 py-8 space-y-10 pb-20">
              <div className="grid grid-cols-2 gap-4">
                {displayDistance !== null && (
                  <StatCard
                    label="Distance"
                    value={session.distance
                      ? displayDistance.toFixed(2)
                      : `~${displayDistance.toFixed(2)}`
                    }
                    unit="km"
                    highlight={!isPlannedSession}
                  />
                )}
                {displayDuration !== null && (
                  <StatCard
                    label="Durée"
                    value={session.duration
                      ? (normalizeDurationFormat(displayDuration) || displayDuration)
                      : `~${displayDuration}`
                    }
                    highlight={!isPlannedSession}
                  />
                )}
                {displayPace !== null && (
                  <StatCard
                    label="Allure"
                    value={session.avgPace
                      ? displayPace
                      : `~${displayPace}`
                    }
                    unit="min/km"
                  />
                )}
                {displayHR !== null && (
                  <StatCard
                    label="FC moyenne"
                    value={session.avgHeartRate
                      ? displayHR
                      : `~${displayHR}`
                    }
                    unit={displayHR && typeof displayHR === 'number' ? "bpm" : undefined}
                  />
                )}
                {(isPlannedSession ? session.targetRPE : session.perceivedExertion) && (
                  <StatCard
                    label={isPlannedSession ? "RPE cible" : "Effort (RPE)"}
                    value={isPlannedSession ? (session.targetRPE ?? '-') : (session.perceivedExertion ?? '-')}
                    unit="/10"
                  />
                )}
              </div>

              {session.comments && (
                <div id="session-notes" className="space-y-4">
                  <div className="flex items-center">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/80">
                      {isPlannedSession ? 'Conseils du Coach' : 'Notes de séance'}
                    </h3>
                  </div>
                  <div className={cn(
                    "p-6 rounded-[2rem] text-sm leading-relaxed whitespace-pre-wrap relative overflow-hidden",
                    "bg-gradient-to-br from-muted/20 to-muted/5 dark:from-white/[0.02] dark:to-transparent border border-border/40 text-foreground/80 font-medium"
                  )}>
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                      <MessageSquare className="w-24 h-24 rotate-12" />
                    </div>
                    {session.comments}
                  </div>
                </div>
              )}

              {hasStravaData && (
                <div className="space-y-6 pt-2">
                  {(session.elevationGain || session.averageCadence || session.calories) && (
                    <div className="space-y-6">
                      <h3 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.25em] flex items-center gap-2">
                        Données Capteurs
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {typeof session.elevationGain === 'number' && session.elevationGain > 0 && (
                          <StatCard label="Dénivelé" value={session.elevationGain} unit="m" />
                        )}
                        {session.averageCadence && (
                          <StatCard label="Cadence" value={formatCadence(session.averageCadence)} unit="ppm" />
                        )}
                        {typeof session.calories === 'number' && (
                          <StatCard label="Calories" value={session.calories} unit="kcal" />
                        )}
                      </div>
                    </div>
                  )}

                  {session.weather && (
                    <div className="space-y-6">
                      <h3 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.25em] flex items-center gap-2">
                        Conditions
                      </h3>
                      <EnvironmentCard weather={session.weather} />
                    </div>
                  )}
                  {canEnrichWeather && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.25em] flex items-center gap-2">
                        Conditions
                      </h3>
                      <div className="rounded-2xl border border-border/40 bg-muted/40 dark:bg-white/[0.03] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all">
                        <div className="flex items-center gap-5 text-sm">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Sparkles className="h-7 w-7 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-foreground font-black uppercase tracking-[0.15em] text-[11px]">Météo manquante</div>
                            <div className="text-xs text-muted-foreground/70 leading-relaxed font-medium max-w-[280px]">Ajoutez les conditions climatiques réelles pour une analyse plus précise.</div>
                          </div>
                        </div>
                        <Button
                          variant="action"
                          size="sm"
                          disabled={isEnrichingWeather}
                          onClick={handleEnrichWeather}
                          className="w-full sm:w-auto h-10 px-8"
                          data-testid="enrich-weather-button"
                        >
                          {isEnrichingWeather ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Récupération…
                            </>
                          ) : (
                            'Récupérer'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  {canEnrichStreams && (
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.25em] flex items-center gap-2">
                        Analyse de la séance
                      </h3>
                      <div className="rounded-2xl border border-border/40 bg-muted/40 dark:bg-white/[0.03] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all">
                        <div className="flex items-center gap-5 text-sm">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Sparkles className="h-7 w-7 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-foreground font-black uppercase tracking-[0.15em] text-[11px]">Streams manquants</div>
                            <div className="text-xs text-muted-foreground/70 leading-relaxed font-medium max-w-[280px]">Ajoutez les streams Strava disponibles (allure, altitude, FC, cadence) pour afficher les graphiques détaillés.</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="action"
                          disabled={isEnrichingStreams}
                          onClick={handleEnrichStreams}
                          className="w-full sm:w-auto h-10 px-8"
                          data-testid="enrich-streams-button"
                        >
                          {isEnrichingStreams ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Analyse…
                            </>
                          ) : (
                            'Récupérer'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasStravaData && session.stravaStreams && (
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.25em]">
                    Analyse de la séance
                  </h3>
                  <StreamsSection streams={session.stravaStreams} />
                </div>
              )}

              {session.intervalDetails && session.intervalDetails.steps?.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.25em]">
                      Structure de la séance
                    </h3>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                      {session.intervalDetails.steps.length} segments
                    </span>
                  </div>
                  <IntervalDetailsView 
                    intervalDetails={session.intervalDetails}
                    isPlanned={isPlannedSession}
                    compact={true}
                    className="px-0 py-2"
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-lg">
              Parcours du {session.date 
                ? new Date(session.date).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long' 
                  }) 
                : 'séance'
              }
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-[60vh]">
            {decodedCoordinates.length > 0 && (
              <LeafletRoute 
                coordinates={decodedCoordinates} 
                height="100%" 
                interactive={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
