'use client';

import { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO, 
  addMonths, 
  subMonths, 
  getDay 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { type TrainingSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarViewInlineProps {
  sessions: TrainingSession[];
  onDayClick: (date: Date, sessions: TrainingSession[]) => void;
}

export function CalendarViewInline({ sessions, onDayClick }: CalendarViewInlineProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const sessionsByDate = sessions.reduce((acc: Record<string, TrainingSession[]>, session: TrainingSession) => {
    try {
      if (session.date) {
        const sessionDate = parseISO(session.date);
        const dateKey = format(sessionDate, 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(session);
      }
    } catch {
      // Skip invalid dates
    }
    return acc;
  }, {});

  const handleDateClick = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const daySessions = sessionsByDate[dateKey] || [];
    if (daySessions.length > 0) {
      onDayClick(day, daySessions);
    }
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2">
        <div className="flex flex-col">
          <h4 className="text-xl font-bold tracking-tight">
            {format(currentMonth, 'MMMM yyyy', { locale: fr }).toUpperCase()}
          </h4>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">
            {Object.keys(sessionsByDate).filter(k => k.startsWith(format(currentMonth, 'yyyy-MM'))).length} jours d&apos;activité ce mois-ci
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth} className="rounded-full hover:bg-violet-500/10 hover:text-violet-500 border-border/50 transition-colors">
            <span className="sr-only">Mois précédent</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-full hover:bg-violet-500/10 hover:text-violet-500 border-border/50 transition-colors">
            <span className="sr-only">Mois suivant</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border/20 rounded-2xl overflow-hidden border border-border/40">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div key={day} className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest py-3 bg-muted/30">
            {day}
          </div>
        ))}
        
        {Array.from({ length: (getDay(monthStart) + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[100px] bg-muted/5 opacity-30" />
        ))}

        {days.map((day: Date) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const daySessions = sessionsByDate[dateKey] || [];
          const hasSessions = daySessions.length > 0;
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toString()}
              onClick={() => hasSessions && handleDateClick(day)}
              disabled={!hasSessions}
              className={cn(
                "min-h-[100px] p-2 transition-all flex flex-col gap-2 text-left relative group",
                isSameMonth(day, currentMonth) ? 'bg-card' : 'bg-muted/10 text-muted-foreground',
                hasSessions ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default'
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                  isToday ? 'bg-violet-600 text-white shadow-lg' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                {hasSessions && (
                  <div className="flex -space-x-1">
                    {daySessions.slice(0, 3).map((_, i) => (
                       <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 ring-2 ring-background" />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-1 w-full mt-1">
                {daySessions.slice(0, 2).map((session: TrainingSession, idx: number) => (
                  <div 
                    key={idx}
                    className={cn(
                      "text-[9px] px-2 py-1 rounded-md truncate w-full font-bold uppercase tracking-tight border",
                      session.status === 'completed' 
                        ? 'bg-violet-500/10 text-violet-600 border-violet-500/20' 
                        : 'bg-muted text-muted-foreground border-border/50'
                    )}
                    title={session.sessionType ?? undefined}
                  >
                    {session.sessionType || '-'}
                  </div>
                ))}
                {daySessions.length > 2 && (
                  <div className="text-[9px] text-muted-foreground font-bold px-1 mt-0.5">
                    + {daySessions.length - 2} SÉANCES
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          <span>Réalisée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-muted border border-border" />
          <span>Programmée</span>
        </div>
      </div>
    </div>
  );
}
