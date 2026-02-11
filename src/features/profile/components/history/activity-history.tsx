'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Grid3X3, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
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
import { StatCard } from '@/components/ui/stat-card';
import { IntervalDetailsView } from '@/features/dashboard/components/interval-details-view';
import { formatMinutesToHHMMSS, formatDisplayDuration } from '@/lib/utils/duration';
import { formatDisplayPace } from '@/lib/utils/pace';
import { capitalize } from '@/lib/utils/text';
import { isFractionneType } from '@/lib/utils/session-type';
import { isCompleted } from '@/lib/domain/sessions/session-selectors';

interface ActivityHistoryProps {
  sessions: TrainingSession[];
}

type HistoryViewMode = 'heatmap' | 'calendar';

type SessionWithType = TrainingSession & { type: 'completed' | 'planned' };

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
        type: isCompleted(s) ? 'completed' : 'planned',
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
            <div className="flex items-center gap-1 p-1 bg-muted/20 backdrop-blur-md rounded-2xl border border-border/40 shadow-sm">
              <Button
                variant={historyViewMode === 'heatmap' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setHistoryViewMode('heatmap')}
                className={cn(
                  "h-8 px-4 rounded-xl active:scale-95 transition-all text-xs font-medium",
                  historyViewMode === 'heatmap' 
                    ? "bg-violet-600 text-white hover:bg-violet-700 shadow-none" 
                    : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Heatmap
              </Button>
              <Button
                variant={historyViewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setHistoryViewMode('calendar')}
                className={cn(
                  "h-8 px-4 rounded-xl active:scale-95 transition-all text-xs font-medium",
                  historyViewMode === 'calendar' 
                    ? "bg-violet-600 text-white hover:bg-violet-700 shadow-none" 
                    : "text-muted-foreground hover:bg-white/5"
                )}
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
                      ? 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  )}>
                    {session.type === 'completed' ? 'Effectuée' : 'Programmée'}
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { 
                      label: session.type === 'completed' ? 'Distance' : 'Distance prévue', 
                      value: session.type === 'completed' ? (session.distance ?? '--') : (session.targetDistance ? `~${session.targetDistance}` : '--'),
                      unit: 'km',
                      highlight: session.type === 'completed'
                    },
                    { 
                      label: session.type === 'completed' ? 'Durée' : 'Durée prévue', 
                      value: session.type === 'completed' ? formatDisplayDuration(session.duration) : (session.targetDuration ? `~${formatMinutesToHHMMSS(session.targetDuration)}` : '--'),
                      highlight: session.type === 'completed'
                    },
                    { 
                      label: 'Allure', 
                      value: session.type === 'completed' ? formatDisplayPace(session.avgPace) : (session.targetPace ? `~${session.targetPace}` : '--'), 
                      unit: '/km' 
                    },
                    { 
                      label: 'FC', 
                      value: session.type === 'completed' ? (session.avgHeartRate ?? '--') : (session.targetHeartRateBpm ? `${session.targetHeartRateBpm}` : '--'), 
                      unit: 'bpm' 
                    },
                  ].map((stat, i) => (
                    <StatCard
                      key={i}
                      label={stat.label}
                      value={stat.value}
                      unit={stat.unit}
                      highlight={stat.highlight}
                    />
                  ))}
                </div>

                {(session.type === 'completed' ? session.perceivedExertion : session.targetRPE) && (
                  <div className="p-6 rounded-2xl bg-muted/40 dark:bg-white/[0.03] border border-border/40">
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.15em] mb-4 opacity-70">
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
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/80">
                        Notes & Commentaires
                      </h3>
                    </div>
                    <div className={cn(
                      "p-6 rounded-[2rem] text-sm leading-relaxed whitespace-pre-wrap relative overflow-hidden transition-all duration-300",
                      "bg-gradient-to-br from-muted/20 to-muted/5 dark:from-white/[0.02] dark:to-transparent border border-border/40 text-foreground/80 font-medium"
                    )}>
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                        <MessageSquare className="w-24 h-24 rotate-12" />
                      </div>
                      <p className="italic relative z-10">
                        &ldquo;{session.comments}&rdquo;
                      </p>
                    </div>
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
