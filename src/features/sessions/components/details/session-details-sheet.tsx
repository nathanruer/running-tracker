'use client';

import { useState } from 'react';
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
import { ExternalLink, Map, Calendar, MessageSquare } from 'lucide-react';
import type { TrainingSession, IntervalStep } from '@/lib/types';
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

interface SessionDetailsSheetProps {
  session: TrainingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionDetailsSheet({ session, open, onOpenChange }: SessionDetailsSheetProps) {
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

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

  const isPlanned = session.status === 'planned';
  const hasStravaData = session.source === 'strava' && stravaData !== null;
  const hasRoute = decodedCoordinates.length > 0 && mapPath;

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
                     <span className="text-xs font-black uppercase tracking-[0.2em]">{isPlanned ? 'Séance recommandée' : 'Séance complétée'}</span>
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
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={isPlanned ? "outline" : "secondary"} 
                      className={cn(
                        "h-6 px-3 text-[10px] uppercase font-bold tracking-widest bg-background/60 backdrop-blur-md border border-border/40 pointer-events-none rounded-full",
                        isPlanned && "border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]"
                      )}
                    >
                      {session.sessionType}
                    </Badge>
                  </div>
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
                <StatCard
                  label="Distance"
                  value={displayDistance !== null
                    ? session.distance
                      ? displayDistance.toFixed(2)
                      : `~${displayDistance.toFixed(2)}`
                    : '-'
                  }
                  unit="km"
                  highlight={!isPlanned}
                />
                <StatCard
                  label="Durée"
                  value={displayDuration !== null
                    ? session.duration
                      ? (normalizeDurationFormat(displayDuration) || displayDuration)
                      : `~${displayDuration}`
                    : '-'
                  }
                  highlight={!isPlanned}
                />
                <StatCard
                  label="Allure"
                  value={displayPace !== null
                    ? session.avgPace
                      ? displayPace
                      : `~${displayPace}`
                    : '-'
                  }
                  unit="min/km"
                />
                <StatCard
                  label="FC moyenne"
                  value={displayHR !== null
                    ? session.avgHeartRate
                      ? displayHR
                      : `~${displayHR}`
                    : '-'
                  }
                  unit={displayHR && typeof displayHR === 'number' ? "bpm" : undefined}
                />
                {(isPlanned ? session.targetRPE : session.perceivedExertion) && (
                  <StatCard
                    label={isPlanned ? "RPE cible" : "Effort (RPE)"}
                    value={isPlanned ? (session.targetRPE ?? '-') : (session.perceivedExertion ?? '-')}
                    unit="/10"
                  />
                )}
              </div>

              {session.comments && (
                <div id="session-notes" className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-muted dark:bg-white/[0.05] border border-border/40">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/80">
                      {isPlanned ? 'Conseils du Coach' : 'Notes de séance'}
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
                  <div className="bg-muted/20 dark:bg-white/[0.02] border border-border/40 rounded-[2rem] overflow-hidden backdrop-blur-sm">
                    <div className="grid grid-cols-4 px-6 py-4 bg-muted/40 dark:bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      <div>Segment</div>
                      <div className="text-center">Durée</div>
                      <div className="text-center">Dist.</div>
                      <div className="text-center">Allure</div>
                    </div>
                    <div className="divide-y divide-border/20 px-2 pb-2">
                      {session.intervalDetails.steps.map((step: IntervalStep, i: number) => (
                        <div 
                          key={i} 
                          className={cn(
                            "grid grid-cols-4 px-4 py-3 text-xs items-center transition-all duration-300 rounded-xl hover:bg-muted/30 dark:hover:bg-white/[0.05]",
                            step.stepType === 'effort' && "bg-primary/[0.03] dark:bg-primary/[0.05]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full ring-4 shadow-sm",
                              step.stepType === 'effort' ? "bg-primary ring-primary/10" : 
                              step.stepType === 'warmup' || step.stepType === 'cooldown' ? "bg-blue-500 ring-blue-500/10" : 
                              "bg-emerald-500 ring-emerald-500/10"
                            )} />
                            <span className="font-bold text-foreground/70 uppercase tracking-wider text-[10px]">
                              {step.stepType === 'effort' ? 'Effort' : 
                               step.stepType === 'recovery' ? 'Récup' : 
                               step.stepType === 'warmup' ? 'Échauff.' :
                               step.stepType === 'cooldown' ? 'Retour' : step.stepType}
                            </span>
                          </div>
                          <div className="text-center font-bold tabular-nums text-foreground/80">{step.duration || '-'}</div>
                          <div className="text-center font-bold tabular-nums text-foreground/80">{step.distance ? `${step.distance}m` : '-'}</div>
                          <div className="text-center font-bold tabular-nums text-foreground/80">{step.pace || '-'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
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
