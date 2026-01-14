'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type IntervalDetails } from '@/lib/types';
import { generateIntervalStructure, calculateIntervalTotals, cleanIntervalSteps } from '@/lib/utils/intervals';
import { secondsToPace } from '@/lib/utils/formatters/pace';
import { parseDuration, normalizeDurationFormat, normalizePaceFormat, formatDuration } from '@/lib/utils/duration';
import { estimateEffectiveDistance } from '@/lib/utils/distance';
import { extractStepHR } from '@/lib/utils/hr';
import { getStepLabelAuto, filterStepsByType } from '@/lib/utils/step';
import { Target, ListChecks } from 'lucide-react';

interface IntervalDetailsViewProps {
  intervalDetails: IntervalDetails;
  isPlanned?: boolean;
}

export function IntervalDetailsView({
  intervalDetails,
  isPlanned = false,
}: IntervalDetailsViewProps) {
  const [filter, setFilter] = useState<'all' | 'effort' | 'recovery'>('all');

  const {
    targetEffortPace,
    targetEffortHR,
  } = intervalDetails;

  const steps = cleanIntervalSteps(intervalDetails.steps || []);
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

  const getTargetEffortHR = (): string | null => {
    const effortSteps = filterStepsByType(steps, 'effort');
    if (effortSteps.length > 0) {
      const hrRanges = effortSteps
        .map(step => step.hrRange)
        .filter(Boolean);

      if (hrRanges.length > 0) {
        const uniqueRanges = [...new Set(hrRanges)];
        if (uniqueRanges.length === 1) {
          return uniqueRanges[0] as string;
        }
      }
    }

    if (targetEffortHR) {
      return `${targetEffortHR}`;
    }

    if (effortSteps.length > 0) {
      const hrValues = effortSteps
        .map(step => step.hr ? `${step.hr}` : null)
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

  const targetHRDisplay = getTargetEffortHR();

  const displayStructure = generateIntervalStructure(intervalDetails) || '-';

  return (
    <div className="space-y-4 py-3 px-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-transparent border border-border/40">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex p-2.5 rounded-lg bg-violet-500/10 shrink-0">
            <Target className="h-5 w-5 text-violet-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Objectif Séance</span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-base font-black text-foreground tracking-tight underline decoration-violet-500/30 underline-offset-4">
                {displayStructure}
              </span>
              <span className="text-xs font-mono text-muted-foreground/80">
                Cible : <span className="text-foreground/90 font-bold">{secondsToPace(parseDuration(targetEffortPace)) || '-'}/km</span>
                {targetHRDisplay ? <span className="ml-1.5 opacity-40">|</span> : ''}
                {targetHRDisplay ? <span className="ml-1.5 font-bold text-orange-400/80">{targetHRDisplay} bpm</span> : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end md:self-auto">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
              {isPlanned ? 'Moy. Prévue' : 'Moy. Réelle'} ({filter === 'all' ? 'Totale' : filter === 'effort' ? 'Efforts' : 'Récups'})
            </span>
            <div className="flex items-baseline text-xl font-black font-mono text-foreground tracking-tighter">
              {averages.avgPace !== '-' ? (
                <>
                  <span>{averages.avgPace}</span>
                  <span className="text-xs font-normal text-muted-foreground">/km</span>
                </>
              ) : (
                <span className="text-muted-foreground/30 font-medium">--:--</span>
              )}
              {averages.avgHR ? (
                <>
                  <span className="text-sm font-normal opacity-30 ml-3">|</span>
                  <span className="text-xs font-bold text-orange-400/80 ml-3">
                    {averages.avgHR} <span className="text-xs text-muted-foreground">bpm</span>
                  </span>
                </>
              ) : ''}
            </div>
          </div>
          
          <div className="h-10 w-[1px] bg-border/60" />

          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'effort' | 'recovery')} className="w-[180px]">
            <TabsList className="grid grid-cols-3 h-9 bg-background/50 border border-border/40 p-1">
              <TabsTrigger value="all" className="text-[10px] uppercase font-bold px-0 h-7 transition-all data-[state=active]:bg-muted/60">Toutes</TabsTrigger>
              <TabsTrigger value="effort" disabled={!hasEffortSteps} className="text-[10px] uppercase font-bold px-0 h-7 transition-all data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-500">Effort</TabsTrigger>
              <TabsTrigger value="recovery" disabled={!hasRecoverySteps} className="text-[10px] uppercase font-bold px-0 h-7 transition-all data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500">Récup</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="border-border/40 shadow-none overflow-hidden bg-transparent">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40 text-muted-foreground/50 uppercase tracking-tighter">
                  <th className="py-2.5 px-4 text-left font-bold w-16">Intervalle</th>
                  <th className="py-2.5 px-4 text-center font-bold">Durée</th>
                  <th className="py-2.5 px-4 text-center font-bold">Distance</th>
                  <th className="py-2.5 px-4 text-center font-bold">Allure</th>
                  <th className="py-2.5 px-4 text-center font-bold">FC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredSteps.map((step, index) => {
                  const durationSec = parseDuration(step.duration) || 0;
                  const paceSec = parseDuration(step.pace) || 0;

                  const distanceResult = estimateEffectiveDistance(
                    durationSec,
                    paceSec > 0 ? paceSec : null,
                    step.distance || null
                  );
                  const displayDistance = distanceResult.distance;

                  let displayPace = step.pace;

                  if (!displayPace && durationSec > 0 && displayDistance > 0) {
                     const estimatedPaceSec = durationSec / displayDistance;
                     displayPace = secondsToPace(estimatedPaceSec);
                  }


                  return (
                  <tr
                    key={`${step.stepNumber}-${index}`}
                    className={index % 2 === 0 ? 'bg-violet-500/[0.02]' : ''}
                  >
                    <td className="py-2 px-4 text-left">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          step.stepType === 'effort' ? 'bg-violet-500' : 
                          step.stepType === 'recovery' ? 'bg-green-500' : 'bg-muted-foreground'
                        }`} />
                        <span className="font-semibold text-muted-foreground">{getStepLabelAuto(step, steps)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center font-mono text-muted-foreground/70">
                      {step.duration === '00:00' || step.duration === '00:00:00' ? '-' : (normalizeDurationFormat(step.duration || '') || step.duration || '-')}
                    </td>
                    <td className="py-2 px-4 text-center font-mono">
                      {displayDistance && displayDistance > 0 ? (
                        <>
                          {displayDistance.toFixed(2)} <span className="text-xs text-muted-foreground">km</span>
                        </>
                      ) : '-'}
                    </td>
                    <td className="py-2 px-4 text-center font-mono font-bold text-foreground underline decoration-violet-500/20 underline-offset-4">
                      {displayPace ? (
                          <>
                           {(normalizePaceFormat(displayPace) || displayPace)}
                           <span className="text-xs text-muted-foreground">/km</span>
                          </>
                      ) : '-'}
                    </td>
                    <td className="py-2 px-4 text-center font-mono text-muted-foreground/70">
                      {(() => {
                        const hrValue = extractStepHR(step);
                        return hrValue ? (
                          <>
                            {step.hrRange || Math.round(hrValue)} <span className="text-xs text-muted-foreground">bpm</span>
                          </>
                        ) : '-';
                      })()}
                    </td>
                  </tr>
                );})}
                {filteredSteps.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground italic text-sm">
                      Aucune donnée pour ce filtre
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {(averages.totalDist !== "0.00" || averages.totalTime !== "-") && (
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 pl-1 uppercase font-bold tracking-widest">
           <div className="flex items-center gap-2">
             <ListChecks className="h-3 w-3" />
             <span>Totaux ({filter === 'all' ? 'Toutes' : filter === 'effort' ? 'Efforts' : 'Récupérations'}):</span>
           </div>
           {averages.totalTime !== "-" && (
             <span>Temps: {averages.totalTime}</span>
           )}
           {averages.totalDist !== "0.00" && (
             <span>Distance: {averages.totalDist} km</span>
           )}
        </div>
      )}
    </div>
  );
}
