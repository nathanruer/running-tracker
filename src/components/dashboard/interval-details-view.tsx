'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type IntervalDetails } from '@/lib/types';
import { generateIntervalStructure } from '@/lib/utils';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface IntervalDetailsViewProps {
  intervalDetails: IntervalDetails;
}

const paceToSeconds = (pace: string | null): number | null => {
  if (!pace) return null;
  const [min, sec] = pace.split(':').map(Number);
  if (isNaN(min) || isNaN(sec)) return null;
  return min * 60 + sec;
};

export function IntervalDetailsView({
  intervalDetails,
}: IntervalDetailsViewProps) {
  const {
    targetEffortPace,
    actualEffortPace,
    targetEffortHR,
    actualEffortHR,
    steps,
  } = intervalDetails;

  const targetSec = paceToSeconds(targetEffortPace);
  const actualSec = paceToSeconds(actualEffortPace);
  const paceDiff = targetSec && actualSec ? actualSec - targetSec : null;
  const paceDiffPercent =
    targetSec && paceDiff ? ((paceDiff / targetSec) * 100).toFixed(1) : null;

  const hrDiff = targetEffortHR && actualEffortHR ? actualEffortHR - targetEffortHR : null;

  const hasDetailedData = steps && steps.length > 0;

  const getStepLabel = (step: any) => {
    const effortSteps = steps?.filter((s) => s.stepType === 'effort') || [];
    const effortIndex = effortSteps.findIndex((s) => s.stepNumber === step.stepNumber);

    switch (step.stepType) {
      case 'warmup':
        return 'Échauffement';
      case 'effort':
        return `Effort ${effortIndex + 1}`;
      case 'recovery':
        return 'Récupération';
      case 'cooldown':
        return 'Récup. finale';
      default:
        return step.stepType;
    }
  };

  const displayStructure = generateIntervalStructure(intervalDetails) || '-';

  return (
    <div className="space-y-2">
      <Card className="bg-transparent border-none shadow-none p-0">
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-0 pt-0">
          <CardTitle className="text-sm font-medium">Résumé de la séance</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {displayStructure}
            </Badge>

          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground/60 text-xs uppercase">
                  <th className="p-2 text-left font-medium">Phase</th>
                  <th className="p-2 text-left font-medium">Allure Cible</th>
                  <th className="p-2 text-left font-medium">Allure Moy</th>
                  <th className="p-2 text-left font-medium">Diff.</th>
                  <th className="p-2 text-left font-medium">FC Cible</th>
                  <th className="p-2 text-left font-medium">FC Moy</th>
                  <th className="p-2 text-left font-medium">Diff.</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-500" />
                    Effort
                  </td>
                  <td className="p-2 font-mono">{targetEffortPace || '-'}</td>
                  <td className="p-2 font-mono font-bold">{actualEffortPace || '-'}</td>
                  <td className="p-2">
                    {paceDiff !== null && paceDiffPercent !== null && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          paceDiff > 0 ? 'text-red-500' : 'text-green-500'
                        }`}
                      >
                        {paceDiff > 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <TrendingUp className="h-3 w-3" />
                        )}
                        <span>
                          {Math.abs(paceDiff)}s ({paceDiff > 0 ? '+' : ''}
                          {paceDiffPercent}%)
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-2 font-mono">{targetEffortHR || '-'}</td>
                  <td className="p-2 font-mono">{actualEffortHR || '-'}</td>
                  <td className="p-2">
                    {hrDiff !== null && (
                      <div
                        className={`flex items-center gap-1 text-xs ${
                          hrDiff > 0 ? 'text-orange-500' : 'text-blue-500'
                        }`}
                      >
                        {hrDiff > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>
                          {hrDiff > 0 ? '+' : ''}
                          {hrDiff}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {hasDetailedData && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm">Détails des étapes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Type d'étape</th>
                    <th className="p-2 text-left">Durée</th>
                    <th className="p-2 text-left">Distance</th>
                    <th className="p-2 text-left">Allure</th>
                    <th className="p-2 text-left">FC</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr key={step.stepNumber} className="border-b">
                      <td className="p-2 font-medium">{getStepLabel(step)}</td>
                      <td className="p-2 font-mono">{step.duration || '-'}</td>
                      <td className="p-2">{step.distance ? `${step.distance} km` : '-'}</td>
                      <td className="p-2 font-mono">{step.pace || '-'}</td>
                      <td className="p-2">{step.hr ? `${step.hr} bpm` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
