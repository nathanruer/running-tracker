'use client';

import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatCard } from '@/components/ui/stat-card';
import { MessageSquare } from 'lucide-react';
import { formatCadence } from '@/lib/utils/strava/cadence';
import type { TrainingSession } from '@/lib/types';
import { decodePolyline, coordinatesToSVG } from '@/lib/utils/geo/polyline';
import { cn } from '@/lib/utils/cn';
import { validateStravaData } from '@/lib/validation/strava';
import { MAP_DIMENSIONS } from '@/lib/constants/map';
import { isPlanned } from '@/lib/domain/sessions/session-selectors';
import { IntervalDetailsView } from '@/features/dashboard/components/interval-details-view';
import { useSessionEnrichment } from '@/features/sessions/hooks/details/use-session-enrichment';
import { EnvironmentCard } from './environment-card';
import { StreamsSection } from './streams-section';
import { SessionHero } from './session-hero';
import { SessionStatsGrid } from './session-stats-grid';
import { EnrichmentPrompt } from './enrichment-prompt';
import { RouteMapDialog } from './route-map-dialog';
import { SectionTitle } from './section-title';

interface SessionDetailsSheetProps {
  session: TrainingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionUpdated?: (session: TrainingSession) => void;
}

export function SessionDetailsSheet({
  session,
  open,
  onOpenChange,
  onSessionUpdated,
}: SessionDetailsSheetProps) {
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const { isEnrichingWeather, isEnrichingStreams, enrichWeather, enrichStreams } =
    useSessionEnrichment({ session, onSessionUpdated });

  if (!session) return null;

  const stravaData = validateStravaData(session.stravaData);
  const polyline = stravaData?.map?.summary_polyline;
  const decodedCoordinates = polyline ? decodePolyline(polyline) : [];
  const mapPath = polyline
    ? coordinatesToSVG(decodedCoordinates, MAP_DIMENSIONS.WIDTH, MAP_DIMENSIONS.HEIGHT).path
    : null;

  const isPlannedSession = isPlanned(session);
  const hasStravaData = session.source === 'strava' && stravaData !== null;
  const hasExternalData = session.source !== null && stravaData !== null;
  const hasRoute = decodedCoordinates.length > 0 && !!mapPath;
  const canEnrichWeather = !isPlannedSession && hasExternalData && hasRoute && !session.weather;
  const canEnrichStreams =
    !isPlannedSession && hasExternalData && !!session.externalId && session.hasStreams !== true;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent hideClose className="w-full sm:max-w-lg lg:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <SessionHero
              session={session}
              isPlannedSession={isPlannedSession}
              hasRoute={hasRoute}
              mapPath={mapPath}
              externalSource={hasExternalData ? session.source ?? null : null}
              onExpandMap={() => setMapDialogOpen(true)}
            />

            <div className="px-8 py-8 space-y-10 pb-20">
              <SessionStatsGrid session={session} isPlannedSession={isPlannedSession} />

              {session.comments && (
                <div id="session-notes" className="space-y-4">
                  <div className="flex items-center">
                    <SectionTitle className="text-muted-foreground/80">
                      {isPlannedSession ? 'Conseils du Coach' : 'Notes de séance'}
                    </SectionTitle>
                  </div>
                  <div
                    className={cn(
                      'p-6 rounded-[2rem] text-sm leading-relaxed whitespace-pre-wrap relative overflow-hidden',
                      'bg-gradient-to-br from-muted/20 to-muted/5 dark:from-white/[0.02] dark:to-transparent border border-border/40 text-foreground/80 font-medium'
                    )}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                      <MessageSquare className="w-24 h-24 rotate-12" />
                    </div>
                    {session.comments}
                  </div>
                </div>
              )}

              {hasExternalData && (
                <div className="space-y-6 pt-2">
                  {(session.elevationGain || session.averageCadence || session.calories) && (
                    <div className="space-y-6">
                      <SectionTitle className="flex items-center gap-2">Données Capteurs</SectionTitle>
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
                      <SectionTitle className="flex items-center gap-2">Conditions</SectionTitle>
                      <EnvironmentCard weather={session.weather} />
                    </div>
                  )}
                  {canEnrichWeather && (
                    <EnrichmentPrompt
                      sectionTitle="Conditions"
                      title="Météo manquante"
                      description="Ajoutez les conditions climatiques réelles pour une analyse plus précise."
                      loadingLabel="Récupération…"
                      isLoading={isEnrichingWeather}
                      onEnrich={enrichWeather}
                      testId="enrich-weather-button"
                    />
                  )}
                  {canEnrichStreams && (
                    <EnrichmentPrompt
                      sectionTitle="Analyse de la séance"
                      title="Streams manquants"
                      description="Ajoutez les streams Strava disponibles (allure, altitude, FC, cadence) pour afficher les graphiques détaillés."
                      loadingLabel="Analyse…"
                      isLoading={isEnrichingStreams}
                      onEnrich={enrichStreams}
                      testId="enrich-streams-button"
                    />
                  )}
                </div>
              )}

              {hasExternalData && session.stravaStreams && (
                <div className="space-y-6">
                  <SectionTitle>Analyse de la séance</SectionTitle>
                  <StreamsSection streams={session.stravaStreams} />
                </div>
              )}

              {session.intervalDetails && session.intervalDetails.steps?.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <SectionTitle>Structure de la séance</SectionTitle>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                      {session.intervalDetails.steps.length} segments
                    </span>
                  </div>
                  <IntervalDetailsView
                    intervalDetails={session.intervalDetails}
                    compact={true}
                    className="px-0 py-2"
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <RouteMapDialog
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        coordinates={decodedCoordinates}
        date={session.date}
      />
    </>
  );
}
