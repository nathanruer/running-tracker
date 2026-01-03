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
import { ExternalLink, Map } from 'lucide-react';
import type { TrainingSession, IntervalStep } from '@/lib/types';
import { decodePolyline, coordinatesToSVG } from '@/lib/utils/polyline';
import { cn } from '@/lib/utils/cn';
import { validateStravaData } from '@/lib/validation/strava';
import { MAP_DIMENSIONS } from '@/lib/constants/map';
import dynamic from 'next/dynamic';

const LeafletRoute = dynamic(
  () => import('@/components/ui/leaflet-route').then((mod) => mod.LeafletRoute),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted/10 animate-pulse" />
  }
);

import { WeatherWidget } from './weather-widget';
import { StreamsSection } from './streams-section';
import { formatCadence } from '@/lib/utils/cadence';

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

  const hasStravaData = session.source === 'strava' && stravaData !== null;
  const hasRoute = decodedCoordinates.length > 0 && mapPath;

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
                <div className="h-20" />
              )}
              
              <div className={cn(
                "px-6 pb-4",
                hasRoute 
                  ? "absolute bottom-0 left-0 right-0 z-20 pt-8" 
                  : "pt-6"
              )}>
                <SheetHeader className="text-left space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-border/50">
                      {session.sessionType}
                    </Badge>

                  </div>
                  <SheetTitle className="text-2xl font-semibold tracking-tight">
                    {session.date 
                      ? new Date(session.date).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        }) 
                      : 'Séance à planifier'
                    }
                  </SheetTitle>
                <div className="flex items-center justify-between w-full">
                  {hasStravaData && session.externalId ? (
                    <a 
                      href={`https://www.strava.com/activities/${session.externalId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Voir sur Strava
                    </a>
                  ) : <div></div>}
                  {hasRoute && (
                    <button
                      onClick={() => setMapDialogOpen(true)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors ml-auto"
                    >
                      <Map className="w-3 h-3" />
                      Voir la carte
                    </button>
                  )}
                </div>
                </SheetHeader>
              </div>
            </div>

            <div className="px-6 py-6 space-y-6 pb-10">
              <div className="grid grid-cols-2 gap-3">
                <StatCard 
                  label="Distance" 
                  value={session.distance 
                    ? session.distance 
                    : session.targetDistance 
                      ? `~${session.targetDistance}` 
                      : '-'
                  } 
                  unit="km" 
                  highlight
                />
                <StatCard 
                  label="Durée" 
                  value={session.duration 
                    ? session.duration 
                    : session.targetDuration 
                      ? `~${session.targetDuration} min` 
                      : '-'
                  } 
                  highlight
                />
                <StatCard 
                  label="Allure" 
                  value={session.avgPace 
                    ? session.avgPace 
                    : session.targetPace 
                      ? `~${session.targetPace}` 
                      : '-'
                  } 
                  unit="min/km"
                />
                <StatCard 
                  label="FC moyenne" 
                  value={session.avgHeartRate 
                    ? session.avgHeartRate 
                    : session.targetHeartRateBpm 
                      ? `~${session.targetHeartRateBpm}` 
                      : session.targetHeartRateZone 
                        ? `Zone ${session.targetHeartRateZone}` 
                        : '-'
                  } 
                  unit={session.avgHeartRate || session.targetHeartRateBpm ? "bpm" : undefined}
                />
              </div>

              {hasStravaData && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Données avancées
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {typeof session.elevationGain === 'number' && session.elevationGain > 0 && (
                      <StatCard label="Dénivelé" value={session.elevationGain} unit="m" />
                    )}
                    {session.averageCadence && (
                      <StatCard label="Cadence" value={formatCadence(session.averageCadence)} unit="ppm" />
                    )}
                    {session.calories && (
                      <StatCard label="Calories" value={session.calories} unit="kcal" />
                    )}
                    {session.averageTemp && (
                      <StatCard label="Température" value={session.averageTemp.toFixed(0)} unit="°C" />
                    )}
                  </div>


                  {session.weather && (
                    <WeatherWidget weather={session.weather} />
                  )}
                </div>
              )}

              {hasStravaData && session.stravaStreams !== null && session.stravaStreams !== undefined && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Analyse de la séance
                  </h3>
                  <StreamsSection streams={session.stravaStreams} />
                </div>
              )}

              {session.comments && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Notes
                  </h3>
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-sm leading-relaxed whitespace-pre-wrap">
                    {session.comments}
                  </div>
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
