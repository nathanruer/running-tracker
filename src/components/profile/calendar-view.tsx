'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { TrainingSession } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

  // Organiser les sessions par date
  const sessionsByDate = sessions.reduce((acc, session) => {
    try {
      // Les séances ont une date si elles sont planifiées à une date précise ou effectuées
      if (session.date) {
        const sessionDate = parseISO(session.date);
        const dateKey = format(sessionDate, 'yyyy-MM-dd');

        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }

        // Déterminer le type basé sur le status
        const type = session.status === 'completed' ? 'completed' : 'planned';

        acc[dateKey].push({
          ...session,
          type,
          displayDate: sessionDate
        });
      }
    } catch (error) {
      // Ignorer les dates invalides
      console.error('Erreur lors du parsing de la date pour la session', session.id, error);
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
    return duration || '--';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calendrier d'entraînement</CardTitle>
              <CardDescription>Visualisez votre historique et vos séances programmées</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={previousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
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
          {/* Calendrier */}
          <div className="space-y-2">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-1 auto-rows-fr">
              {/* Jours vides avant le début du mois */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] bg-muted/5 rounded-md" />
              ))}

              {/* Jours du mois */}
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
                    
                    {/* Liste des sessions */}
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

          {/* Légende */}
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

      {/* Dialog pour afficher les détails des sessions */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {selectedSessions.map((session, index) => (
              <Card key={index} className={`${
                session.type === 'completed' 
                  ? 'border-violet-500/50 bg-violet-500/5' 
                  : 'border-gray-500/50 bg-gray-500/5'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {session.sessionType}
                    </CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      session.type === 'completed'
                        ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300'
                        : 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
                    }`}>
                      {session.type === 'completed' ? 'Effectuée' : 'Programmée'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {session.type === 'completed' ? 'Distance' : 'Distance prévue'}
                      </p>
                      <p className="text-lg font-semibold">
                        {session.type === 'completed'
                          ? `${session.distance ?? '--'} km`
                          : session.targetDistance
                            ? `~${session.targetDistance} km`
                            : '--'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {session.type === 'completed' ? 'Durée' : 'Durée prévue'}
                      </p>
                      <p className="text-lg font-semibold">
                        {session.type === 'completed'
                          ? formatDuration(session.duration)
                          : session.targetDuration
                            ? `~${Math.floor(session.targetDuration / 60).toString().padStart(2, '0')}:${(session.targetDuration % 60).toString().padStart(2, '0')}:00`
                            : '--'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {session.type === 'completed' ? 'Allure moyenne' : 'Allure cible'}
                      </p>
                      <p className="text-lg font-semibold">
                        {session.type === 'completed'
                          ? `${formatPace(session.avgPace)} min/km`
                          : session.targetPace
                            ? `~${session.targetPace} min/km`
                            : '--'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {session.type === 'completed' ? 'FC moyenne' : 'FC cible'}
                      </p>
                      <p className="text-lg font-semibold">
                        {session.type === 'completed'
                          ? `${session.avgHeartRate ?? '--'} bpm`
                          : (session.targetHeartRateBpm || session.targetHeartRateZone)
                            ? `${session.targetHeartRateBpm || session.targetHeartRateZone} bpm`
                            : '--'
                        }
                      </p>
                    </div>
                  </div>

                  {session.intervalStructure && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Structure</p>
                      <p className="text-sm bg-muted/50 p-2 rounded">{session.intervalStructure}</p>
                    </div>
                  )}

                  {(session.type === 'completed' ? session.perceivedExertion : session.targetRPE) && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {session.type === 'completed' ? 'Effort perçu' : 'RPE cible'}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 rounded ${
                                i < ((session.type === 'completed' ? session.perceivedExertion : session.targetRPE) || 0)
                                  ? 'bg-primary'
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {session.type === 'completed' ? session.perceivedExertion : session.targetRPE}/10
                        </span>
                      </div>
                    </div>
                  )}

                  {session.comments && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Commentaires</p>
                      <p className="text-sm bg-muted/50 p-2 rounded">{session.comments}</p>
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
