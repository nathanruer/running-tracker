'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type IntervalDetails, type IntervalStep } from '@/lib/types';
import { generateIntervalStructure, calculateIntervalTotals, cleanIntervalSteps } from '@/lib/utils/intervals';
import { secondsToPace } from '@/lib/utils/pace';
import { parseDuration, formatDuration } from '@/lib/utils/duration';
import { filterStepsByType } from '@/lib/utils/intervals';
import { Target } from 'lucide-react';
import { IntervalStepsTable } from './interval-steps-table';

interface IntervalDetailsViewProps {
  intervalDetails: IntervalDetails;
  isPlanned?: boolean;
  compact?: boolean;
}

export function IntervalDetailsView({
  intervalDetails,
  compact = false,
  className,
}: IntervalDetailsViewProps & { className?: string }) {
  const [filter, setFilter] = useState<'all' | 'effort' | 'recovery'>('all');

  const {
    targetEffortPace,
    targetEffortHR,
  } = intervalDetails;

  const steps: IntervalStep[] = cleanIntervalSteps(intervalDetails.steps || []);
  const hasEffortSteps = steps.some((step) => step.stepType === 'effort');
  const hasRecoverySteps = steps.some((step) => step.stepType === 'recovery');

  const filteredSteps = filter === 'all'
    ? steps
    : steps.filter((step) => step.stepType === filter);

  const getAverages = () => {
    const totals = calculateIntervalTotals(filteredSteps);
    return {
      avgPace: totals.avgPaceFormatted || '-',
      avgHR: totals.avgBpm,
      totalDist: totals.totalDistanceKm > 0 ? totals.totalDistanceKm.toFixed(2) : "0.00",
      totalTime: formatDuration(Math.round(totals.totalDurationMin * 60)) || '-'
    };
  };

  const averages = getAverages();

  const getTargetHRByType = (type: 'effort' | 'recovery'): string | null => {
    const typeSteps = filterStepsByType(steps, type);
    if (typeSteps.length > 0) {
      const hrRanges = typeSteps
        .map((step: IntervalStep) => step.hrRange)
        .filter(Boolean);

      if (hrRanges.length > 0) {
        const uniqueRanges = [...new Set(hrRanges)];
        if (uniqueRanges.length === 1) {
          return uniqueRanges[0] as string;
        }
      }
    }

    if (type === 'effort' && targetEffortHR) {
      return `${targetEffortHR}`;
    }

    if (typeSteps.length > 0) {
      const hrValues = typeSteps
        .map((step: IntervalStep) => step.hr ? `${step.hr}` : null)
        .filter(Boolean);

      if (hrValues.length > 0) {
        const uniqueValues = [...new Set(hrValues)];
        if (uniqueValues.length === 1) {
          return uniqueValues[0] as string;
        }
      }
    }

    return null;
  };

  const targetHRDisplay = getTargetHRByType('effort');

  const displayStructure = generateIntervalStructure(intervalDetails) || '-';

  return (
    <div className={cn("space-y-6 pt-2 pb-4", !compact && "px-3", className)}>
      <div className={cn(
        "relative flex flex-col justify-between gap-6 p-6 rounded-2xl overflow-hidden shadow-xl",
        "bg-muted/30 backdrop-blur-md border border-white/[0.05]",
        !compact ? "md:flex-row md:items-center" : "space-y-6"
      )}>
        <div className="flex items-start gap-5 relative z-10">
          {!compact && (
            <div className="hidden sm:flex p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 shrink-0">
              <Target className="h-6 w-6 text-violet-500" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] leading-none">
              Objectif Séance
            </span>
            <div className="flex flex-col gap-1.5">
              <div className={cn(
                "font-black tracking-tighter leading-tight flex flex-wrap items-baseline gap-x-2",
                compact ? "text-base" : "text-lg"
              )}>
                {(() => {
                  const workoutType = intervalDetails.workoutType;
                  const targetPaceStr = secondsToPace(parseDuration(targetEffortPace));
                  
                  let structure = displayStructure;
                  if (workoutType && displayStructure.startsWith(`${workoutType}: `)) {
                    structure = displayStructure.substring(workoutType.length + 2);
                  }

                  return (
                    <>
                      {workoutType && <span className="text-violet-500">{workoutType}</span>}
                      {workoutType && <span className="text-foreground/20">:</span>}
                      <span className="text-foreground/90">{structure}</span>
                      
                      {(targetPaceStr || targetHRDisplay) && (
                        <div className="flex items-center gap-2 ml-1">
                          <span className="text-foreground/20 font-light">@</span>
                          <span className="text-violet-400/80 font-bold font-mono text-[0.9em]">
                            {targetPaceStr || '--:--'}/km
                          </span>
                          {targetHRDisplay && (
                            <>
                              <span className="text-foreground/10">·</span>
                              <span className="text-muted-foreground font-bold font-mono text-[0.9em]">
                                {targetHRDisplay} bpm
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className={cn(
          "grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 relative z-10",
          compact ? "border-t border-white/[0.05] pt-6" : "md:border-l md:border-white/10 md:pl-10"
        )}>
          {[
            { label: 'Temps', value: averages.totalTime },
            { label: 'Distance', value: averages.totalDist, unit: 'km' },
            { 
              label: 'Allure', 
              value: averages.avgPace, 
              unit: '/km',
              target: filter === 'effort' ? secondsToPace(parseDuration(targetEffortPace)) : null
            },
            { 
              label: 'FC', 
              value: averages.avgHR, 
              unit: 'bpm',
              target: filter === 'effort' ? targetHRDisplay : null
            }
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] leading-none">
                {stat.label}
              </span>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "font-mono font-black text-foreground tracking-tighter",
                    compact ? "text-base" : "text-lg"
                  )}>
                    {stat.value || '--'}
                  </span>
                  {stat.unit && stat.value && stat.value !== '-' && (
                    <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                      {stat.unit}
                    </span>
                  )}
                </div>
                {stat.target && stat.value && stat.value !== '-' && (
                  <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-tight leading-none mt-0.5">
                    Obj. {stat.target}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded-full bg-violet-500/40" />
          <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
            Détails des Intervalles
          </span>
        </div>
        <Tabs 
          value={filter} 
          onValueChange={(v) => setFilter(v as 'all' | 'effort' | 'recovery')} 
          className="w-[210px]"
        >
          <TabsList className="grid grid-cols-3 h-8 bg-white/[0.03] border border-white/[0.05] p-0.5 shadow-sm">
            <TabsTrigger value="all" className="text-[9px] uppercase font-bold h-7 data-[state=active]:bg-white/10">Tous</TabsTrigger>
            <TabsTrigger value="effort" disabled={!hasEffortSteps} className="text-[9px] uppercase font-bold h-7 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">Efforts</TabsTrigger>
            <TabsTrigger value="recovery" disabled={!hasRecoverySteps} className="text-[9px] uppercase font-bold h-7 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Récups</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <IntervalStepsTable 
        steps={filteredSteps} 
        allSteps={steps}
        compact={compact}
      />
    </div>
  );
}
