'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Grid3X3, Calendar as CalendarIcon } from 'lucide-react';
import { type TrainingSession } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ActivityHeatmap } from './activity-heatmap';
import { CalendarViewInline } from './calendar-view-inline';
import { IntervalDetailsView } from '@/features/dashboard/components/interval-details-view';
import { formatMinutesToHHMMSS, formatDisplayDuration } from '@/lib/utils/duration';
import { formatDisplayPace } from '@/lib/utils/pace';
import { capitalize } from '@/lib/utils/text';
import { isFractionneType } from '@/lib/utils/session-type';

interface ActivityHistoryProps {
  sessions: TrainingSession[];
}

type HistoryViewMode = 'heatmap' | 'calendar';

interface SessionWithType extends TrainingSession {
  type: 'completed' | 'planned';
}

export function ActivityHistory({ sessions }: ActivityHistoryProps) {
  const [historyViewMode, setHistoryViewMode] = useState<HistoryViewMode>('heatmap');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<SessionWithType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDialogOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isDialogOpen]);

  const handleDayClick = (date: Date, daySessions: TrainingSession[]) => {
    setSelectedDate(date);
    setSelectedSessions(
      daySessions.map(s => ({
        ...s,
        type: s.status === 'completed' ? 'completed' : 'planned',
      }))
    );
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card className="shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Historique d&apos;activité</CardTitle>
              <CardDescription>
                {historyViewMode === 'heatmap' 
                  ? 'Vue annuelle de votre activité' 
                  : 'Calendrier mensuel détaillé'
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border/50">
              <Button
                variant={historyViewMode === 'heatmap' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setHistoryViewMode('heatmap')}
                className={`h-8 px-3 active:scale-95 transition-all ${historyViewMode === 'heatmap' ? 'bg-violet-600 text-white' : 'text-muted-foreground'}`}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Heatmap
              </Button>
              <Button
                variant={historyViewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setHistoryViewMode('calendar')}
                className={`h-8 px-3 active:scale-95 transition-all ${historyViewMode === 'calendar' ? 'bg-violet-600 text-white' : 'text-muted-foreground'}`}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendrier
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyViewMode === 'heatmap' ? (
            <ActivityHeatmap 
              sessions={sessions} 
              onDayClick={handleDayClick}
            />
          ) : (
            <CalendarViewInline 
              sessions={sessions}
              onDayClick={handleDayClick}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-8 pt-8 pb-6 border-b bg-transparent">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {selectedDate && capitalize(format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr }))}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground font-normal flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              {selectedSessions.length} séance{selectedSessions.length > 1 ? 's' : ''} répertoriée{selectedSessions.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div 
            ref={scrollRef}
            className="overflow-y-auto px-8 py-6 space-y-10 custom-scrollbar"
          >
            {selectedSessions.map((session, index) => (
              <div key={index} className="space-y-6 pb-10 border-b border-border/40 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="text-xl font-semibold tracking-tight text-foreground">
                      {session.sessionType}
                    </h4>
                  </div>
                  <span className={cn(
                    "text-xs px-4 py-2 rounded-full font-semibold uppercase tracking-widest border",
                    session.type === 'completed'
                      ? 'bg-violet-500/10 text-violet-600 border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                      : 'bg-muted text-muted-foreground border-border'
                  )}>
                    {session.type === 'completed' ? 'Effectuée' : 'Programmée'}
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: session.type === 'completed' ? 'Distance' : 'Distance prévue', value: session.type === 'completed' ? `${session.distance ?? '--'} km` : (session.targetDistance ? `~${session.targetDistance} km` : '--') },
                    { label: session.type === 'completed' ? 'Durée' : 'Durée prévue', value: session.type === 'completed' ? formatDisplayDuration(session.duration) : (session.targetDuration ? `~${formatMinutesToHHMMSS(session.targetDuration)}` : '--') },
                    { label: 'Allure', value: session.type === 'completed' ? `${formatDisplayPace(session.avgPace)}` : (session.targetPace ? `~${session.targetPace}` : '--'), suffix: '/km' },
                    { label: 'FC', value: session.type === 'completed' ? `${session.avgHeartRate ?? '--'}` : (session.targetHeartRateBpm ? `${session.targetHeartRateBpm}` : '--'), suffix: 'bpm' },
                  ].map((stat, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-transparent border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 opacity-70">{stat.label}</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                        {stat.suffix && <span className="text-xs font-medium text-muted-foreground">{stat.suffix}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {(session.type === 'completed' ? session.perceivedExertion : session.targetRPE) && (
                  <div className="p-6 rounded-2xl bg-transparent border border-border/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 opacity-70">
                      {session.type === 'completed' ? 'Effort perçu (RPE)' : 'RPE cible'}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex gap-1.5 h-3">
                        {Array.from({ length: 10 }).map((_, i) => {
                          const val = (session.type === 'completed' ? session.perceivedExertion : session.targetRPE) || 0;
                          return (
                            <div
                              key={i}
                              className={cn(
                                "flex-1 rounded-full transition-all duration-500",
                                i < val
                                  ? val <= 3 ? 'bg-emerald-500' : val <= 7 ? 'bg-amber-500' : 'bg-rose-500'
                                  : 'bg-border/30'
                              )}
                            />
                          );
                        })}
                      </div>
                      <span className="text-xl font-bold min-w-[3rem] text-right">
                        {session.type === 'completed' ? session.perceivedExertion : session.targetRPE}/10
                      </span>
                    </div>
                  </div>
                )}

                {session.comments && (
                  <div className="p-6 rounded-2xl bg-transparent border border-border/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <p className="text-xs font-semibold text-violet-600/70 uppercase tracking-widest mb-3">Notes & Commentaires</p>
                    <p className="text-base leading-relaxed text-foreground italic font-normal">
                      &ldquo;{session.comments}&rdquo;
                    </p>
                  </div>
                )}

                {isFractionneType(session.sessionType) && session.intervalDetails && (
                  <div className="pt-8 border-t border-border/30">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-6 w-1 rounded-full bg-violet-600" />
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                        Structure des Intervalles
                      </p>
                    </div>
                    <div className={cn("rounded-2xl overflow-hidden border border-border/40", session.type === 'planned' ? 'opacity-80' : '')}>
                      <IntervalDetailsView 
                        intervalDetails={session.intervalDetails} 
                        isPlanned={session.type === 'planned'} 
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
