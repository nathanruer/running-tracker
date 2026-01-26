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

import { WeatherWidget } from './weather-widget';
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
            <div className="relative">
              {hasRoute ? (
                <div className="h-72 w-full flex items-center justify-center relative overflow-hidden">
                  <svg
                    viewBox={`0 0 ${MAP_DIMENSIONS.WIDTH} ${MAP_DIMENSIONS.HEIGHT}`}
                    className="w-full h-full stroke-primary fill-none stroke-[2.5] z-10 opacity-80"
                    style={{ filter: 'drop-shadow(0 4px 12px hsl(var(--primary) / 0.2))' }}
                  >
                    <path d={mapPath} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div className="h-32 w-full bg-gradient-to-b from-primary/10 to-transparent p-6 flex items-end">
                   <div className="flex items-center gap-2 text-primary/60">
                     <Calendar className="w-5 h-5" />
                     <span className="text-sm font-semibold uppercase tracking-widest">{isPlanned ? 'Séance recommandée' : 'Séance complétée'}</span>
                   </div>
                </div>
              )}
              
              <div className={cn(
                "px-6 pb-4",
                hasRoute 
                  ? "absolute bottom-0 left-0 right-0 z-20 pt-8" 
                  : "pt-4"
              )}>
                <SheetHeader className="text-left space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={isPlanned ? "outline" : "secondary"} 
                      className={cn(
                        "bg-background/80 backdrop-blur-sm border-border/50 pointer-events-none",
                        isPlanned && "border-primary/30 text-primary font-bold"
                      )}
                    >
                      {session.sessionType}
                    </Badge>
                  </div>
                  <SheetTitle className="text-3xl font-black tracking-tighter leading-none">
                    {session.date 
                      ? new Date(session.date).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        }).split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
                      : 'Séance à planifier'
                    }
                  </SheetTitle>
                <div className="flex items-center justify-between w-full">
                  {hasStravaData && session.externalId ? (
                    <a 
                      href={`https://www.strava.com/activities/${session.externalId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Voir sur Strava
                    </a>
                  ) : <div></div>}
                  {hasRoute && (
                    <button
                      onClick={() => setMapDialogOpen(true)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors ml-auto font-medium"
                    >
                      <Map className="w-3.5 h-3.5" />
                      Agrandir la carte
                    </button>
                  )}
                </div>
                </SheetHeader>
              </div>
            </div>

            <div className="px-6 py-6 space-y-6 pb-12">
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
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em]">
                      {isPlanned ? 'Conseils du Coach' : 'Notes de séance'}
                    </h3>
                  </div>
                  <div className={cn(
                    "p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap relative overflow-hidden",
                    "bg-muted/30 border border-border/40 text-muted-foreground"
                  )}>
                    {session.comments}
                  </div>
                </div>
              )}

              {hasStravaData && (
                <div className="space-y-6 pt-2">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                      Données Capteurs
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {typeof session.elevationGain === 'number' && session.elevationGain > 0 && (
                        <StatCard label="Dénivelé" value={session.elevationGain} unit="m" />
                      )}
                      {session.averageCadence && (
                        <StatCard label="Cadence" value={formatCadence(session.averageCadence)} unit="ppm" />
                      )}
                      {typeof session.calories === 'number' && (
                        <StatCard label="Calories" value={session.calories} unit="kcal" />
                      )}
                      {typeof session.averageTemp === 'number' && (
                        <StatCard label="Température" value={session.averageTemp.toFixed(0)} unit="°C" />
                      )}
                    </div>
                  </div>

                  {session.weather && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        Conditions Météo
                      </h3>
                      <WeatherWidget weather={session.weather} />
                    </div>
                  )}
                </div>
              )}

              {hasStravaData && session.stravaStreams && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                    Analyse de la séance
                  </h3>
                  <StreamsSection streams={session.stravaStreams} />
                </div>
              )}

              {session.intervalDetails && session.intervalDetails.steps?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Structure
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {session.intervalDetails.steps.length} phases
                    </span>
                  </div>
                  <div className="border border-border/50 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-4 bg-muted/40 p-3 text-xs font-medium text-muted-foreground">
                      <div className="pl-1">Phase</div>
                      <div className="text-center">Durée</div>
                      <div className="text-center">Distance</div>
                      <div className="text-center">Allure</div>
                    </div>
                    <div className="divide-y divide-border/40">
                      {session.intervalDetails.steps.map((step: IntervalStep, i: number) => (
                        <div 
                          key={i} 
                          className={cn(
                            "grid grid-cols-4 p-3 text-sm items-center transition-colors",
                            step.stepType === 'effort' && "bg-primary/5 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-2 pl-1">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              step.stepType === 'effort' ? "bg-primary" : 
                              step.stepType === 'warmup' || step.stepType === 'cooldown' ? "bg-blue-400" : 
                              "bg-emerald-400"
                            )} />
                            <span className="capitalize text-xs">
                              {step.stepType === 'effort' ? 'Effort' : 
                               step.stepType === 'recovery' ? 'Récup' : 
                               step.stepType === 'warmup' ? 'Échauff.' :
                               step.stepType === 'cooldown' ? 'Retour' : step.stepType}
                            </span>
                          </div>
                          <div className="text-center">{step.duration || '-'}</div>
                          <div className="text-center">{step.distance ? `${step.distance}m` : '-'}</div>
                          <div className="text-center">{step.pace || '-'}</div>
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
