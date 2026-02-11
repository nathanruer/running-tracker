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
import { getSessionDistanceKm, getSessionEffectiveDate, isCompleted, isPlanned } from '@/lib/domain/sessions/session-selectors';
import { MONTHS_SHORT_FR } from '@/lib/utils/date';
import { Calendar, Circle } from 'lucide-react';

interface ActivityHeatmapProps {
  sessions: TrainingSession[];
  onDayClick?: (date: Date, sessions: TrainingSession[]) => void;
}

const MONTH_LABELS = MONTHS_SHORT_FR.map((label) => label.charAt(0).toUpperCase() + label.slice(1));
const DAYS = ['Lun', '', 'Mer', '', 'Ven', '', 'Dim'];
const INTENSITY_CLASSES = [
  'bg-muted/40 dark:bg-muted/20',
  'bg-violet-900/40 dark:bg-violet-900/60',
  'bg-violet-700/60 dark:bg-violet-700/80',
  'bg-violet-500/80 dark:bg-violet-500',
  'bg-violet-400 dark:bg-violet-400',
] as const;

export function ActivityHeatmap({ sessions, onDayClick }: ActivityHeatmapProps) {
  const currentYear = getYear(new Date());
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    sessions.forEach(session => {
      const effectiveDate = getSessionEffectiveDate(session);
      if (effectiveDate) {
        years.add(getYear(new Date(effectiveDate)));
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
    if (day.count === 0) return INTENSITY_CLASSES[0];
    
    const hasCompleted = day.sessions.some(isCompleted);
    const intensity = Math.min(day.totalKm / maxKm, 1);
    
    const intensityIndex = intensity < 0.25 ? 1 : intensity < 0.5 ? 2 : intensity < 0.75 ? 3 : 4;
    const colorClass = INTENSITY_CLASSES[intensityIndex];

    if (!hasCompleted) {
      return cn(colorClass, "opacity-30 border border-violet-500/30 border-dashed");
    }

    return colorClass;
  };

  const formatTooltipContent = (day: DayData): React.ReactNode => {
    if (day.count === 0) {
      return (
        <div className="space-y-2 py-1">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
            <Calendar className="w-3 h-3 text-muted-foreground/40" />
            <span className="font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 leading-none">
              {format(day.date, 'EEEE d MMM', { locale: fr })}
            </span>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/30 italic uppercase tracking-wider pl-1">
            Aucune séance
          </p>
        </div>
      );
    }

    const completedKm = day.sessions
      .filter(isCompleted)
      .reduce((sum, s) => sum + getSessionDistanceKm(s), 0);
    const plannedKm = day.sessions
      .filter(isPlanned)
      .reduce((sum, s) => sum + getSessionDistanceKm(s), 0);
    
    const completedCount = day.sessions.filter(isCompleted).length;
    const plannedCount = day.sessions.filter(isPlanned).length;

    return (
      <div className="space-y-4 py-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-muted-foreground/40" />
            <span className="font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 leading-none">
              {format(day.date, 'EEEE d MMM', { locale: fr })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-0.5 rounded-full border border-border/20">
            <Circle className="w-1.5 h-1.5 fill-violet-500 text-violet-500" />
            <span className="text-[9px] font-black text-foreground/80 leading-none">{day.sessions.length}</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {completedCount > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Réalisé</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-foreground tabular-nums">{completedKm.toFixed(1)}</span>
                  <span className="text-[8px] font-bold text-muted-foreground/30 uppercase">KM</span>
                </div>
              </div>
              <div className="space-y-1.5 pl-3">
                {day.sessions.filter(isCompleted).map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-0.5 h-3 bg-violet-500 rounded-full" />
                    <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">
                      {s.sessionType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plannedCount > 0 && (completedCount > 0 ? <div className="h-px bg-white/5 mx-2" /> : null)}

          {plannedCount > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 italic">Programmé</span>
                </div>
                <div className="flex items-baseline gap-1 opacity-60">
                  <span className="text-sm font-black text-foreground tabular-nums">{plannedKm.toFixed(1)}</span>
                  <span className="text-[8px] font-bold text-muted-foreground/30 uppercase">KM</span>
                </div>
              </div>
              <div className="space-y-1.5 pl-3">
                {day.sessions.filter(isPlanned).map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-0.5 h-3 bg-white/10 rounded-full" />
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tight italic">
                      {s.sessionType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border bg-card/50 text-card-foreground shadow-xl w-full overflow-hidden">
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
              
              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground whitespace-nowrap bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                  <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-border/50">
                    <div className="w-3 h-3 rounded-[2px] bg-violet-500/30 border border-violet-500/30 border-dashed" />
                    <span>Programmé</span>
                  </div>
                  <span>Réalisé</span>
                  <div className="flex gap-[2px]">
                    {INTENSITY_CLASSES.map((className, level) => (
                      <div 
                        key={level} 
                        className={cn("w-3 h-3 rounded-[2px]", className)} 
                      />
                    ))}
                  </div>
                  <span>Plus</span>
                </div>
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
                        {MONTH_LABELS[month]}
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

                    <TooltipProvider delayDuration={0} skipDelayDuration={0} disableHoverableContent>
                      <div className="contents">
                        {weeks.map((week, weekIndex) => (
                          <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-[2px]">
                            {week.map((day, dayIndex) => {
                              const uniqueKey = `day-${weekIndex}-${dayIndex}`;
                              return (
                                <Tooltip key={uniqueKey}>
                                  <TooltipTrigger asChild>
                                    <button
                                      className={cn(
                                        "w-full aspect-square rounded-[1px] transition-colors duration-150",
                                        getIntensityClass(day),
                                        day.date.getTime() > 0 && day.count > 0 
                                          ? "hover:brightness-125 hover:ring-1 hover:ring-foreground/30 cursor-pointer z-10" 
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
                                      sideOffset={8}
                                      className="bg-background/40 backdrop-blur-2xl border border-white/10 rounded-xl p-4 shadow-2xl min-w-[240px] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/5 pointer-events-none"
                                    >
                                      {formatTooltipContent(day)}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            })}
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
