'use client';

import { SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { CloseButton } from '@/components/ui/close-button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Map, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { MAP_DIMENSIONS } from '@/lib/constants/map';
import type { TrainingSession } from '@/lib/types';

interface SessionHeroProps {
  session: TrainingSession;
  isPlannedSession: boolean;
  hasRoute: boolean;
  mapPath: string | null;
  externalSource: string | null;
  onExpandMap: () => void;
}

function externalActivityLink(externalId: string): { href: string; label: string } {
  return { href: `https://intervals.icu/activities/${externalId}`, label: 'Voir sur intervals.icu' };
}

function formatLongDate(value: string): string {
  return new Date(value)
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    .split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function sessionTitle(session: TrainingSession): string {
  if (session.date) return formatLongDate(session.date);
  if (session.plannedDate) return formatLongDate(session.plannedDate);
  return 'Séance à planifier';
}

export function SessionHero({
  session,
  isPlannedSession,
  hasRoute,
  mapPath,
  externalSource,
  onExpandMap,
}: SessionHeroProps) {
  const externalLink =
    externalSource && session.externalId
      ? externalActivityLink(session.externalId)
      : null;
  return (
    <div className="relative isolate overflow-hidden">
      <SheetClose asChild>
        <CloseButton className="absolute right-6 top-6 z-50" />
      </SheetClose>
      {hasRoute && mapPath ? (
        <div className="h-80 w-full flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-from)_0%,transparent_70%)] from-primary/10 opacity-50 z-10" />
          <svg
            viewBox={`0 0 ${MAP_DIMENSIONS.WIDTH} ${MAP_DIMENSIONS.HEIGHT}`}
            className="w-full h-full stroke-primary fill-none stroke-[3] z-10 opacity-90 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
          >
            <path d={mapPath} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-primary/10 via-background to-background p-8 flex items-end">
          <div className="flex items-center gap-3 text-primary/80">
            <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              {isPlannedSession ? 'Séance recommandée' : 'Séance complétée'}
            </span>
          </div>
        </div>
      )}

      <div className={cn('px-8 pb-6', hasRoute ? 'absolute bottom-0 left-0 right-0 z-30 pt-12' : 'pt-6')}>
        <SheetHeader className="text-left space-y-4">
          {session.sessionType && (
            <div className="flex items-center gap-3">
              <Badge
                variant={isPlannedSession ? 'outline' : 'secondary'}
                className={cn(
                  'h-6 px-3 text-[10px] uppercase font-bold tracking-widest bg-background/60 backdrop-blur-md border border-border/40 pointer-events-none rounded-full',
                  isPlannedSession && 'border-primary/40 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]'
                )}
              >
                {session.sessionType}
              </Badge>
            </div>
          )}
          <SheetTitle className="text-4xl font-black tracking-tighter leading-[0.9] text-foreground drop-shadow-sm">
            {sessionTitle(session)}
          </SheetTitle>
          <div className="flex items-center justify-between w-full pt-2">
            {externalLink ? (
              <a
                href={externalLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all duration-300"
              >
                <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                </div>
                {externalLink.label}
              </a>
            ) : (
              <div></div>
            )}
            {hasRoute && (
              <button
                onClick={onExpandMap}
                className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-300"
              >
                <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-foreground/5 transition-colors">
                  <Map className="w-3 h-3" />
                </div>
                Agrandir
              </button>
            )}
          </div>
        </SheetHeader>
      </div>
    </div>
  );
}
