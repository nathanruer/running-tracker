import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink } from 'lucide-react';
import type { TrainingSession, IntervalStep } from '@/lib/types';
import { decodePolyline, coordinatesToSVG } from '@/lib/utils/polyline';
import { cn } from '@/lib/utils/cn';
import { validateStravaData } from '@/lib/validation/strava';
import { MAP_DIMENSIONS } from '@/lib/constants/map';

interface SessionDetailsSheetProps {
  session: TrainingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

function StatCard({ label, value, unit, highlight }: StatCardProps) {
  return (
    <div className={cn(
      "flex flex-col p-4 rounded-xl border transition-colors",
      highlight 
        ? "bg-primary/5 border-primary/20" 
        : "bg-muted/30 border-border/50"
    )}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function SessionDetailsSheet({ session, open, onOpenChange }: SessionDetailsSheetProps) {
  if (!session) return null;

  const stravaData = validateStravaData(session.stravaData);
  const polyline = stravaData?.map?.summary_polyline;
  const mapPath = polyline
    ? coordinatesToSVG(
        decodePolyline(polyline),
        MAP_DIMENSIONS.WIDTH,
        MAP_DIMENSIONS.HEIGHT
      ).path
    : null;

  const hasStravaData = session.source === 'strava' && stravaData !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg lg:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col [&>button]:z-50">
        <div className="relative shrink-0">
          {mapPath ? (
            <div className="h-72 w-full bg-gradient-to-b from-muted/50 to-background flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10" />
              <svg
                viewBox={`0 0 ${MAP_DIMENSIONS.WIDTH} ${MAP_DIMENSIONS.HEIGHT}`}
                className="w-full h-full stroke-primary fill-none stroke-[2.5] z-0 opacity-70"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(var(--primary), 0.15))' }}
              >
                <path d={mapPath} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : (
            <div className="h-20 bg-gradient-to-b from-muted/30 to-transparent" />
          )}
          
          <div className={cn("px-6 pb-4", mapPath ? "absolute bottom-0 left-0 right-0 z-20" : "pt-6")}>
            <SheetHeader className="text-left space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-border/50">
                  {session.sessionType}
                </Badge>
                {hasStravaData && (
                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                    Strava
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-2xl font-semibold tracking-tight">
                {session.date 
                  ? new Date(session.date).toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    }) 
                  : 'Séance sans date'
                }
              </SheetTitle>
              {hasStravaData && session.externalId && (
                <a 
                  href={`https://www.strava.com/activities/${session.externalId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit transition-colors"
                >
                  Voir sur Strava <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </SheetHeader>
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6 pb-10">
            <div className="grid grid-cols-2 gap-3">
              <StatCard 
                label="Distance" 
                value={session.distance ?? '-'} 
                unit="km" 
                highlight
              />
              <StatCard 
                label="Durée" 
                value={session.duration ?? '-'} 
                highlight
              />
              <StatCard 
                label="Allure" 
                value={session.avgPace ?? '-'} 
                unit="min/km"
              />
              <StatCard 
                label="FC moyenne" 
                value={session.avgHeartRate ?? '-'} 
                unit="bpm"
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
                    <StatCard label="Cadence" value={session.averageCadence.toFixed(0)} unit="spm" />
                  )}
                  {session.calories && (
                    <StatCard label="Calories" value={session.calories} unit="kcal" />
                  )}
                  {session.averageTemp && (
                    <StatCard label="Température" value={session.averageTemp.toFixed(0)} unit="°C" />
                  )}
                </div>
                {session.minElevation !== undefined && session.maxElevation !== undefined && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Altitude
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-lg font-medium">{session.minElevation?.toFixed(0)}m</span>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-lg font-semibold">{session.maxElevation?.toFixed(0)}m</span>
                    </div>
                  </div>
                )}
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
  );
}
