'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type IntervalDetails, type IntervalStep } from '@/lib/types';
import { generateIntervalStructure } from '@/lib/utils';
import { Target, ListChecks, Timer } from 'lucide-react';

interface IntervalDetailsViewProps {
  intervalDetails: IntervalDetails;
}

const paceToSeconds = (pace: string | null): number | null => {
  if (!pace) return null;
  const parts = pace.split(':').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
};

const secondsToPace = (totalSeconds: number | null): string => {
  if (totalSeconds === null || totalSeconds <= 0) return '-';
  const min = Math.floor(totalSeconds / 60);
  const sec = Math.round(totalSeconds % 60);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export function IntervalDetailsView({
  intervalDetails,
}: IntervalDetailsViewProps) {
  const [filter, setFilter] = useState<'all' | 'effort' | 'recovery'>('all');

  const {
    targetEffortPace,
    targetEffortHR,
    steps = [],
  } = intervalDetails;

  const filteredSteps = steps.filter((step) => {
    if (filter === 'all') return true;
    return step.stepType === filter;
  });

  const calculateWeightedAverages = (items: IntervalStep[]) => {
    let totalDistance = 0;
    let totalSecondsForPace = 0;
    let hrSum = 0;
    let hrCount = 0;

    items.forEach(step => {
      const paceSec = paceToSeconds(step.pace);
      if (step.distance && step.distance > 0 && paceSec && paceSec > 0) {
        totalDistance += step.distance;
        totalSecondsForPace += paceSec * step.distance;
      } else if (paceSec && paceSec > 0) {
        // Fallback for steps without distance: assume 1 unit for simple average 
        // but try to avoid this for weighted accuracy
      }
      
      if (step.hr) {
        hrSum += step.hr;
        hrCount++;
      }
    });

    const avgPaceSec = totalDistance > 0 ? totalSecondsForPace / totalDistance : null;
    const avgHR = hrCount > 0 ? Math.round(hrSum / hrCount) : null;

    return { 
      avgPace: secondsToPace(avgPaceSec), 
      avgHR,
      totalDist: totalDistance.toFixed(2)
    };
  };

  const averages = calculateWeightedAverages(filteredSteps);

  const getStepLabel = (step: IntervalStep) => {
    const typeSteps = steps.filter((s) => s.stepType === step.stepType);
    const index = typeSteps.findIndex((s) => s.stepNumber === step.stepNumber);

    switch (step.stepType) {
      case 'effort': return `E${index + 1}`;
      case 'recovery': return `R${index + 1}`;
      case 'warmup': return 'Échauf.';
      case 'cooldown': return 'Retour';
      default: return step.stepType;
    }
  };

  const displayStructure = generateIntervalStructure(intervalDetails) || '-';

  return (
    <div className="space-y-4 py-3 px-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
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
                Cible : <span className="text-foreground/90 font-bold">{targetEffortPace || '-'}</span>
                {targetEffortHR ? <span className="ml-1.5 opacity-40">|</span> : ''}
                {targetEffortHR ? <span className="ml-1.5 font-bold text-orange-400/80">{targetEffortHR} bpm</span> : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end md:self-auto">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
              Moy. Réelle ({filter === 'all' ? 'Totale' : filter === 'effort' ? 'Efforts' : 'Récups'})
            </span>
            <div className="flex items-baseline gap-2 text-xl font-black font-mono text-foreground tracking-tighter">
              {averages.avgPace}
              {averages.avgHR ? (
                <>
                  <span className="text-sm font-normal opacity-30 ml-1">|</span>
                  <span className="text-xs font-bold text-orange-400/80 ml-1">{averages.avgHR} bpm</span>
                </>
              ) : ''}
            </div>
          </div>
          
          <div className="h-10 w-[1px] bg-border/60" />

          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-[180px]">
            <TabsList className="grid grid-cols-3 h-9 bg-background/50 border border-border/40 p-1">
              <TabsTrigger value="all" className="text-[10px] uppercase font-bold px-0 h-7 transition-all data-[state=active]:bg-muted/60">Toutes</TabsTrigger>
              <TabsTrigger value="effort" className="text-[10px] uppercase font-bold px-0 h-7 transition-all data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-500">Effort</TabsTrigger>
              <TabsTrigger value="recovery" className="text-[10px] uppercase font-bold px-0 h-7 transition-all data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500">Récup</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="border-border/40 shadow-none overflow-hidden bg-card/20">
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
                {filteredSteps.map((step) => (
                  <tr 
                    key={step.stepNumber} 
                    className={`hover:bg-muted/10 transition-colors ${
                      step.stepType === 'effort' ? 'bg-violet-500/[0.02]' : ''
                    }`}
                  >
                    <td className="py-2 px-4 text-left">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          step.stepType === 'effort' ? 'bg-violet-500' : 
                          step.stepType === 'recovery' ? 'bg-green-500' : 'bg-muted-foreground'
                        }`} />
                        <span className="font-semibold text-muted-foreground">{getStepLabel(step)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-center font-mono text-muted-foreground/70">
                      {step.duration === '00:00' ? '-' : (step.duration || '-')}
                    </td>
                    <td className="py-2 px-4 text-center font-mono">
                      {step.distance && step.distance > 0 ? `${step.distance.toFixed(2)} km` : '-'}
                    </td>
                    <td className="py-2 px-4 text-center font-mono font-bold text-foreground underline decoration-violet-500/20 underline-offset-4">
                      {step.pace || '-'}
                    </td>
                    <td className="py-2 px-4 text-center font-mono text-muted-foreground/70">
                      {step.hr ? (
                        <span className="flex items-center justify-center gap-1">
                          {step.hr}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
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
      
      {averages.totalDist !== "0.00" && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 pl-1 uppercase font-bold tracking-widest">
           <ListChecks className="h-3 w-3" />
           Distance Totale ({filter === 'all' ? 'Toutes' : filter === 'effort' ? 'Effort' : 'Récupération'}): {averages.totalDist} km
        </div>
      )}
    </div>
  );
}
