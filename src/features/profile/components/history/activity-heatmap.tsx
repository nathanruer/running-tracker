'use client';

import { useMemo, useState } from 'react';
import { format, getYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrainingSession } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateHeatmapData, type DayData } from '@/lib/domain/analytics/heatmap-calculator';

interface ActivityHeatmapProps {
  sessions: TrainingSession[];
  onDayClick?: (date: Date, sessions: TrainingSession[]) => void;
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const DAYS = ['Lun', '', 'Mer', '', 'Ven', '', 'Dim'];

export function ActivityHeatmap({ sessions, onDayClick }: ActivityHeatmapProps) {
  const currentYear = getYear(new Date());
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    sessions.forEach(session => {
      if (session.date) {
        years.add(getYear(new Date(session.date)));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [sessions, currentYear]);

  const { weeks, monthLabels, maxKm, yearStats } = useMemo(() => 
    calculateHeatmapData(sessions, selectedYear),
    [sessions, selectedYear]
  );

  const getIntensityClass = (day: DayData): string => {
    if (day.date.getTime() === 0) return 'bg-transparent';
    if (day.count === 0) return 'bg-muted/40 dark:bg-muted/20';
    const intensity = Math.min(day.totalKm / maxKm, 1);
    if (intensity < 0.25) return 'bg-violet-900/40 dark:bg-violet-900/60';
    if (intensity < 0.5) return 'bg-violet-700/60 dark:bg-violet-700/80';
    if (intensity < 0.75) return 'bg-violet-500/80 dark:bg-violet-500';
    return 'bg-violet-400 dark:bg-violet-400';
  };

  const formatTooltipContent = (day: DayData): React.ReactNode => {
    if (day.count === 0) {
      return (
        <div className="text-xs p-1">
          <div className="font-medium mb-1">{format(day.date, 'EEEE d MMMM yyyy', { locale: fr })}</div>
          <div className="text-muted-foreground">Aucune séance</div>
        </div>
      );
    }
    return (
      <div className="text-xs space-y-2 p-1">
        <div className="font-medium">{format(day.date, 'EEEE d MMMM yyyy', { locale: fr })}</div>
        <div className="flex items-center gap-2 text-violet-500 font-bold">
          {day.totalKm.toFixed(1)} km <span className="text-muted-foreground font-normal">• {day.count} séance{day.count > 1 ? 's' : ''}</span>
        </div>
        <div className="space-y-1">
          {day.sessions.map((s, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/30 p-1 rounded">
              <span className={`w-2 h-2 rounded-full ${s.status === 'completed' ? 'bg-violet-500' : 'bg-gray-400'}`} />
              <span className="truncate max-w-[150px]">{s.sessionType}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border bg-card/50 text-card-foreground shadow-sm w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="flex-1 p-4 lg:p-6 min-w-0">
          <div className="flex flex-col gap-6">
             <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold">
                  {yearStats.totalSessions} activités en {selectedYear}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                   <span>{yearStats.totalKm.toFixed(0)} km courus</span>
                   <span>•</span>
                   <span>{yearStats.activeDays} jours d&apos;entraînement</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground whitespace-nowrap bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                <span>Moins</span>
                <div className="flex gap-[2px]">
                  {[0, 1, 2, 3, 4].map(level => (
                    <div 
                      key={level} 
                      className={cn(
                        "w-3 h-3 rounded-[2px]",
                        level === 0 ? "bg-muted/40 dark:bg-muted/20" : 
                        level === 1 ? "bg-violet-900/40 dark:bg-violet-900/60" :
                        level === 2 ? "bg-violet-700/60 dark:bg-violet-700/80" :
                        level === 3 ? "bg-violet-500/80 dark:bg-violet-500" :
                        "bg-violet-400 dark:bg-violet-400"
                      )} 
                    />
                  ))}
                </div>
                <span>Plus</span>
              </div>
            </div>

            <div className="relative w-full">
              <div className="pb-2 overflow-x-auto custom-scrollbar-horizontal">
                <div className="min-w-[700px] lg:min-w-0">
                  <div 
                    className="grid grid-cols-[repeat(var(--week-count),1fr)] lg:grid-cols-[2.5rem_repeat(var(--week-count),1fr)] gap-[2px] mb-2 h-4"
                    style={{ '--week-count': weeks.length } as React.CSSProperties}
                  >
                    <div className="hidden lg:block" />
                    {monthLabels.map(({ month, weekIndex }, i) => (
                      <div
                        key={i}
                        className="text-[10px] text-muted-foreground font-medium whitespace-nowrap"
                        style={{ gridColumnStart: typeof window !== 'undefined' && window.innerWidth < 1024 ? weekIndex + 1 : weekIndex + 2 }}
                      >
                        {MONTHS[month]}
                      </div>
                    ))}
                  </div>

                  <div 
                    className="grid grid-cols-[repeat(var(--week-count),1fr)] lg:grid-cols-[2.5rem_repeat(var(--week-count),1fr)] gap-[2px] w-full"
                    style={{ '--week-count': weeks.length } as React.CSSProperties}
                  >
                    <div className="hidden lg:grid grid-rows-7 gap-[2px] pr-2">
                      {DAYS.map((day, i) => (
                        <div key={i} className="text-[10px] text-muted-foreground font-medium flex items-center leading-none">
                          {day}
                        </div>
                      ))}
                    </div>

                    <TooltipProvider delayDuration={100}>
                      <div className="contents">
                        {weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className="grid grid-rows-7 gap-[2px]">
                            {week.map((day, dayIndex) => (
                              <Tooltip key={dayIndex}>
                                <TooltipTrigger asChild>
                                  <button
                                    className={cn(
                                      "w-full aspect-square rounded-[2px] transition-all hover:scale-110",
                                      getIntensityClass(day),
                                      day.date.getTime() > 0 && day.count > 0 
                                        ? "hover:ring-2 hover:ring-foreground/50 cursor-pointer z-10" 
                                        : "cursor-default"
                                    )}
                                    onClick={() => {
                                      if (day.date.getTime() > 0 && day.count > 0 && onDayClick) {
                                        onDayClick(day.date, day.sessions);
                                      }
                                    }}
                                    disabled={day.date.getTime() === 0}
                                  />
                                </TooltipTrigger>
                                {day.date.getTime() > 0 && (
                                  <TooltipContent 
                                    side="top" 
                                    className="p-2 bg-popover/95 backdrop-blur-sm border shadow-2xl min-w-[200px]"
                                  >
                                    {formatTooltipContent(day)}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            ))}
                          </div>
                        ))}
                      </div>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 bg-muted/20 shrink-0 lg:w-[160px]">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2 hidden lg:block">Historique</h4>
          <ScrollArea className="h-full">
             <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {availableYears.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "text-xs px-4 h-9 lg:h-10 rounded-full lg:rounded-lg whitespace-nowrap justify-center lg:justify-start font-medium",
                    selectedYear === year 
                      ? "bg-violet-600 text-white shadow-lg hover:bg-violet-700" 
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {year}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
