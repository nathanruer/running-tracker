import { type IntervalStep } from '@/lib/types';
import { getStepLabelAuto } from '@/lib/utils/intervals';
import { secondsToPace, normalizePaceFormat } from '@/lib/utils/pace';
import { parseDuration, normalizeDurationFormat } from '@/lib/utils/duration';
import { estimateEffectiveDistance } from '@/lib/utils/distance';
import { extractStepHR } from '@/lib/utils/heart-rate';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface IntervalStepsTableProps {
  steps: IntervalStep[];
  allSteps: IntervalStep[];
  showContainer?: boolean;
  compact?: boolean;
}

/**
 * Shared component for rendering interval steps in a table.
 * Used in both the dashboard expansion view and the session details sheet.
 */
export function IntervalStepsTable({ 
  steps, 
  allSteps, 
  showContainer = true,
  compact = false
}: IntervalStepsTableProps) {
  const tableContent = (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-20">
          <tr className="bg-muted/50 dark:bg-white/[0.03] backdrop-blur-md border-b border-white/[0.05] text-muted-foreground/60 uppercase tracking-[0.15em] text-[9px] font-black">
            <th className={cn("py-3 text-left font-black w-16", compact ? "px-2" : "px-4")}>Intervalle</th>
            <th className={cn("py-3 text-center font-black", compact ? "px-2" : "px-4")}>Durée</th>
            <th className={cn("py-3 text-center font-black", compact ? "px-2" : "px-4")}>Distance</th>
            <th className={cn("py-3 text-center font-black", compact ? "px-2" : "px-4")}>Allure</th>
            <th className={cn("py-3 text-center font-black", compact ? "px-2" : "px-4")}>FC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/10">
          {steps.map((step: IntervalStep, index: number) => {
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

            const stepColorClass = step.stepType === 'effort' ? 'bg-violet-500' : 
                                  step.stepType === 'recovery' ? 'bg-green-500' : 
                                  'bg-muted-foreground/60';

            return (
              <tr
                key={`${step.stepNumber}-${index}`}
                className={cn(
                  index % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'
                )}
              >
                <td className={cn("py-3 text-left relative", compact ? "px-2" : "px-4")}>
                  {/* Vertical indicator bar */}
                  <div className={cn(
                    "absolute left-0 top-1 bottom-1 w-0.5 rounded-full",
                    stepColorClass
                  )} />
                  
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-black tracking-wider text-[9px] uppercase",
                      step.stepType === 'effort' ? "text-violet-500" : 
                      step.stepType === 'recovery' ? "text-green-500/80" : "text-muted-foreground"
                    )}>
                      {getStepLabelAuto(step, allSteps)}
                    </span>
                  </div>
                </td>
                <td className={cn("py-3 text-center", compact ? "px-1" : "px-4")}>
                  <span className="font-mono text-xs tabular-nums text-foreground/70">
                    {step.duration === '00:00' || step.duration === '00:00:00' ? '-' : (normalizeDurationFormat(step.duration || '') || step.duration || '-')}
                  </span>
                </td>
                <td className={cn("py-2.5 text-center", compact ? "px-1" : "px-4")}>
                  {displayDistance && displayDistance > 0 ? (
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="font-mono text-[13px] font-bold tabular-nums text-foreground/90">
                        {displayDistance.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">km</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/30">-</span>
                  )}
                </td>
                <td className={cn("py-2.5 text-center", compact ? "px-1" : "px-4")}>
                  {displayPace ? (
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="font-mono text-[13px] font-black tabular-nums text-foreground tracking-tight">
                        {(normalizePaceFormat(displayPace) || displayPace)}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">/km</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/30">-</span>
                  )}
                </td>
                <td className={cn("py-2.5 text-center", compact ? "px-1" : "px-4")}>
                  {(() => {
                    const hrValue = extractStepHR(step);
                    return hrValue ? (
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="font-mono text-[13px] font-bold tabular-nums text-foreground/70">
                          {step.hrRange || Math.round(hrValue)}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">bpm</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
          {steps.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-muted-foreground italic text-sm">
                Aucune donnée pour ce filtre
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (!showContainer) return tableContent;

  return (
    <Card className="border-border/40 shadow-none overflow-hidden bg-transparent">
      <CardContent className="p-0">
        {tableContent}
      </CardContent>
    </Card>
  );
}
