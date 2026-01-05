'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TrainingSession } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IntervalDetailsView } from '@/features/dashboard/components/interval-details-view';
import { normalizeDurationFormat } from '@/lib/utils/duration';

interface CalendarViewProps {
  sessions: TrainingSession[];
}

interface SessionWithType extends TrainingSession {
  type: 'completed' | 'planned';
  displayDate: Date;
}

export function CalendarView({ sessions }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<SessionWithType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const sessionsByDate = sessions.reduce((acc, session) => {
    try {
      if (session.date) {
        const sessionDate = parseISO(session.date);
        const dateKey = format(sessionDate, 'yyyy-MM-dd');

        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }

        const type = session.status === 'completed' ? 'completed' : 'planned';

        acc[dateKey].push({
          ...session,
          type,
          displayDate: sessionDate
        });
      }
    } catch {
      // Skip sessions with invalid dates
    }
    return acc;
  }, {} as Record<string, SessionWithType[]>);

  const handleDateClick = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const daySessions = sessionsByDate[dateKey] || [];
    
    if (daySessions.length > 0) {
      setSelectedDate(day);
      setSelectedSessions(daySessions);
      setIsDialogOpen(true);
    }
  };

  const getSessionsForDay = (day: Date): SessionWithType[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return sessionsByDate[dateKey] || [];
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const formatPace = (pace: string | null | undefined): string => {
    return pace || '--';
  };

  const formatDuration = (duration: string | null | undefined): string => {
    if (!duration) return '--';
    return normalizeDurationFormat(duration) || duration;
  };

  const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Calendrier d&apos;entraînement</CardTitle>
              <CardDescription>Visualisez votre historique et vos séances programmées</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={previousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium flex-1 sm:flex-none sm:min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 auto-rows-fr">
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] bg-muted/5 rounded-md" />
              ))}

              {days.map((day) => {
                const daySessions = getSessionsForDay(day);
                const hasSessions = daySessions.length > 0;
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toString()}
                    onClick={() => hasSessions && handleDateClick(day)}
                    disabled={!hasSessions}
                    className={`
                      min-h-[80px] p-1.5 rounded-md border transition-all flex flex-col gap-1 text-left overflow-hidden
                      ${isSameMonth(day, currentMonth) ? 'bg-card' : 'bg-muted/10 text-muted-foreground'}
                      ${isToday ? 'ring-2 ring-primary ring-inset' : 'border-border'}
                      ${hasSessions ? 'cursor-pointer hover:border-primary/50' : 'cursor-default'}
                    `}
                  >
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    
                    <div className="flex flex-col gap-1 w-full">
                      {daySessions.map((session, idx) => (
                        <div 
                          key={idx}
                          className={`
                            text-[10px] px-1.5 py-0.5 rounded truncate w-full font-medium
                            ${session.type === 'completed' 
                              ? 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/20' 
                              : 'bg-gray-500/15 text-gray-700 dark:text-gray-400 border border-gray-500/20'
                            }
                          `}
                          title={session.sessionType}
                        >
                          {session.sessionType}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-violet-500/50" />
              <span className="text-muted-foreground">Réalisée</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-gray-500/50" />
              <span className="text-muted-foreground">Prévue</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-violet-500/5 to-purple-500/5">
            <DialogTitle className="text-3xl font-bold">
              {selectedDate && capitalize(format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr }))}
            </DialogTitle>
            <p className="text-base text-muted-foreground mt-1">
              {selectedSessions.length} séance{selectedSessions.length > 1 ? 's' : ''}
            </p>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4 space-y-8">
            {selectedSessions.map((session, index) => (
              <Card key={index} className="border-0 shadow-none bg-transparent pb-8 border-b border-border/30 last:border-0 last:pb-0">
                <CardHeader className="pb-4 px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl mb-2">
                        {session.sessionType}
                      </CardTitle>
                    </div>
                    <span className={`text-sm px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${
                      session.type === 'completed'
                        ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30'
                        : 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border border-gray-500/30'
                    }`}>
                      {session.type === 'completed' ? 'Effectuée' : 'Programmée'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/40">
                      <p className="text-sm text-muted-foreground mb-1">
                        {session.type === 'completed' ? 'Distance' : 'Distance prévue'}
                      </p>
                      <p className="text-2xl font-bold">
                        {session.type === 'completed'
                          ? `${session.distance ?? '--'} km`
                          : session.targetDistance
                            ? `~${session.targetDistance} km`
                            : '--'
                        }
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/40">
                      <p className="text-sm text-muted-foreground mb-1">
                        {session.type === 'completed' ? 'Durée' : 'Durée prévue'}
                      </p>
                      <p className="text-2xl font-bold">
                        {session.type === 'completed'
                          ? formatDuration(session.duration)
                          : session.targetDuration
                            ? `~${Math.floor(session.targetDuration / 60).toString().padStart(2, '0')}:${(session.targetDuration % 60).toString().padStart(2, '0')}:00`
                            : '--'
                        }
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/40">
                      <p className="text-sm text-muted-foreground mb-1">
                        Allure
                      </p>
                      <p className="text-2xl font-bold">
                        {session.type === 'completed'
                          ? `${formatPace(session.avgPace)}`
                          : session.targetPace
                            ? `~${session.targetPace}`
                            : '--'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">mn/km</p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/40">
                      <p className="text-sm text-muted-foreground mb-1">
                        FC
                      </p>
                      <p className="text-2xl font-bold">
                        {session.type === 'completed'
                          ? `${session.avgHeartRate ?? '--'}`
                          : (session.targetHeartRateBpm || session.targetHeartRateZone)
                            ? `${session.targetHeartRateBpm || session.targetHeartRateZone}`
                            : '--'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">bpm</p>
                    </div>
                  </div>

                  {(session.type === 'completed' ? session.perceivedExertion : session.targetRPE) && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/40">
                      <p className="text-sm text-muted-foreground font-medium mb-3">
                        {session.type === 'completed' ? 'Effort perçu' : 'RPE cible'}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 rounded transition-all ${
                                i < ((session.type === 'completed' ? session.perceivedExertion : session.targetRPE) || 0)
                                  ? 'bg-primary shadow-sm'
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-base font-bold">
                          {session.type === 'completed' ? session.perceivedExertion : session.targetRPE}/10
                        </span>
                      </div>
                    </div>
                  )}

                  {session.comments && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/40 text-muted-foreground">
                      <p className="text-sm font-medium mb-3 uppercase tracking-wider opacity-70">Commentaires</p>
                      <p className="text-base leading-relaxed italic">&quot;{session.comments}&quot;</p>
                    </div>
                  )}

                  {session.sessionType === 'Fractionné' && session.intervalDetails && (
                    <div className={`mt-6 pt-6 border-t border-border/30 ${
                      session.type === 'planned' ? 'opacity-80 grayscale-[0.3]' : ''
                    }`}>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                        Détail des intervalles
                      </p>
                      <div className={session.type === 'planned' ? 'italic' : ''}>
                        <IntervalDetailsView 
                          intervalDetails={session.intervalDetails} 
                          isPlanned={session.type === 'planned'} 
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
