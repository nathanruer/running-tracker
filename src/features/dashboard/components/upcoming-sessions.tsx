'use client';

import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateIntervalStructure } from '@/lib/utils/intervals';
import type { TrainingSession } from '@/lib/types';

interface UpcomingSessionsProps {
  sessions: TrainingSession[];
  onComplete: (session: TrainingSession) => void;
  onView: (session: TrainingSession) => void;
}

function formatPlannedDate(plannedDate: string | null | undefined): string {
  if (!plannedDate) return 'À planifier';
  return new Date(plannedDate).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function buildTargets(session: TrainingSession): string {
  return [
    session.targetDuration ? `${session.targetDuration} min` : null,
    session.targetDistance ? `${session.targetDistance} km` : null,
    session.targetPace ? `${session.targetPace}/km` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function UpcomingSessions({ sessions, onComplete, onView }: UpcomingSessionsProps) {
  if (sessions.length === 0) return null;

  return (
    <section aria-label="Séances à venir" className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <CalendarClock className="h-4 w-4 text-violet-500" />
        <h2 className="label-caps-muted">À venir</h2>
        <span className="label-caps text-violet-500">{sessions.length}</span>
      </div>

      <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] md:grid-flow-row md:grid-cols-3 gap-3 overflow-x-auto pb-1 md:overflow-visible">
        {sessions.map((session) => {
          const structure = generateIntervalStructure(session.intervalDetails);
          const targets = buildTargets(session);

          return (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              data-testid="upcoming-session-card"
              onClick={() => onView(session)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onView(session);
                }
              }}
              className="cursor-pointer text-left rounded-2xl border border-border/50 bg-card/50 hover:border-violet-500/40 transition-colors p-4 flex flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="label-caps text-violet-500 truncate">
                  {session.sessionType ?? 'Séance'}
                </span>
                <span className="label-caps-muted shrink-0">
                  {formatPlannedDate(session.plannedDate)}
                </span>
              </div>

              {targets && (
                <p className="text-sm font-semibold text-foreground/90">{targets}</p>
              )}
              {structure && (
                <p className="text-xs text-muted-foreground font-medium truncate">{structure}</p>
              )}
              {session.targetRPE != null && (
                <p className="label-caps-muted">RPE cible {session.targetRPE}/10</p>
              )}

              <div className="mt-auto pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg w-full"
                  onClick={(event) => {
                    event.stopPropagation();
                    onComplete(session);
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  <span className="label-caps">Compléter</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
