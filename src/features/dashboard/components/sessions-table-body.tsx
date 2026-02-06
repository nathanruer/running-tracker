import { useEffect, useMemo, useState } from 'react';
import { FilterX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { SessionRow } from './session-row';
import type { TrainingSession } from '@/lib/types';

interface SessionsTableBodyProps {
  initialLoading: boolean;
  sessions: TrainingSession[];
  isFetching?: boolean;
  hasActiveFilters?: boolean;
  selectedSessions: Set<string>;
  onToggleSelect: (id: string) => void;
  actions: {
    onEdit: (session: TrainingSession) => void;
    onDelete: (id: string) => void;
    onView?: (session: TrainingSession) => void;
    onPrefetchDetails?: (sessionId: string) => void;
  };
}

// Progressive rendering keeps large tables responsive by chunking row mounts.
const INITIAL_RENDER_COUNT = 50;
const RENDER_BATCH_SIZE = 50;
const RENDER_BATCH_DELAY_MS = 16;

function SessionsTableSkeleton() {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <TableRow key={i} className="border-border/5 hover:bg-transparent h-16">
          {/* Checkbox/Status Icon */}
          <TableCell className="px-6 py-4">
            <div className="h-5 w-5 animate-pulse rounded-lg bg-muted/20 mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
          </TableCell>
          
          {/* # Number */}
          <TableCell className="hidden sm:table-cell py-4">
            <div className="h-3 w-4 animate-pulse rounded-full bg-muted/10 mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
          </TableCell>
          
          {/* Week */}
          <TableCell className="hidden lg:table-cell py-4">
            <div className="h-3 w-4 animate-pulse rounded-full bg-muted/5 mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
          </TableCell>
          
          {/* Date */}
          <TableCell className="py-4">
            <div className="h-4 w-20 animate-pulse rounded-full bg-muted/10 mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
          </TableCell>
          
          {/* Séance (Type + Workout) */}
          <TableCell className="py-4">
            <div className="flex flex-col gap-1.5 items-center">
              <div className="h-4 w-24 animate-pulse rounded-full bg-muted/20" style={{ animationDelay: `${i * 100}ms` }} />
              <div className="h-2.5 w-12 animate-pulse rounded-full bg-muted/10" style={{ animationDelay: `${i * 100}ms` }} />
            </div>
          </TableCell>
          
          {/* Metrics (Duration, Distance, Pace, heartRate) */}
          {[...Array(4)].map((_, mIdx) => (
            <TableCell key={mIdx} className="py-4">
              <div className="flex flex-col gap-1.5 items-center">
                <div className="h-4 w-10 animate-pulse rounded-full bg-muted/15" style={{ animationDelay: `${i * 100 + mIdx * 50}ms` }} />
                <div className="h-2 w-6 animate-pulse rounded-full bg-muted/5" style={{ animationDelay: `${i * 100 + mIdx * 50}ms` }} />
              </div>
            </TableCell>
          ))}
          
          {/* RPE */}
          <TableCell className="py-4">
            <div className="h-6 w-6 animate-pulse rounded-full bg-muted/20 mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
          </TableCell>
          
          {/* Commentaire */}
          <TableCell className="min-w-[320px] px-8 hidden xl:table-cell py-4">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-[100%] animate-pulse rounded-full bg-muted/10" style={{ animationDelay: `${i * 100}ms` }} />
              <div className="h-3 w-[70%] animate-pulse rounded-full bg-muted/5" style={{ animationDelay: `${i * 100}ms` }} />
            </div>
          </TableCell>
          
          {/* Actions */}
          <TableCell className="px-6 py-4">
            <div className="h-8 w-8 animate-pulse rounded-xl bg-muted/10 mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function SessionsEmptyState({
  isFetching,
  hasActiveFilters,
}: {
  isFetching?: boolean;
  hasActiveFilters?: boolean;
}) {
  const title = hasActiveFilters ? 'Aucun résultat avec ces filtres' : 'Aucun résultat trouvé';
  const description = hasActiveFilters
    ? 'Essayez de retirer un filtre ou utilisez le bouton tout effacer.'
    : 'Essayez de modifier votre recherche.';

  return (
    <TableRow>
      <TableCell colSpan={12} className="h-64 text-center">
        <div className={cn(
          "flex flex-col items-center justify-center gap-3 transition-opacity duration-300",
          isFetching ? "opacity-40" : "opacity-100"
        )}>
          <div className="p-4 rounded-full bg-muted/50 border border-border/50">
            <FilterX className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function SessionsTableBody({
  initialLoading,
  sessions,
  isFetching,
  hasActiveFilters,
  selectedSessions,
  onToggleSelect,
  actions,
}: SessionsTableBodyProps) {
  const baseCount = Math.min(sessions.length, INITIAL_RENDER_COUNT);
  const [renderedCount, setRenderedCount] = useState(baseCount);
  const effectiveCount = Math.max(baseCount, Math.min(renderedCount, sessions.length));

  useEffect(() => {
    if (effectiveCount >= sessions.length) return;

    const handle = setTimeout(() => {
      setRenderedCount((current) => Math.min(current + RENDER_BATCH_SIZE, sessions.length));
    }, RENDER_BATCH_DELAY_MS);

    return () => clearTimeout(handle);
  }, [effectiveCount, sessions.length]);

  const visibleSessions = useMemo(
    () => sessions.slice(0, effectiveCount),
    [sessions, effectiveCount]
  );

  if (initialLoading && sessions.length === 0) {
    return (
      <TableBody>
        <SessionsTableSkeleton />
      </TableBody>
    );
  }

  if (sessions.length === 0) {
    return (
      <TableBody>
        <SessionsEmptyState isFetching={isFetching} hasActiveFilters={hasActiveFilters} />
      </TableBody>
    );
  }

  return (
    <TableBody>
      {visibleSessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          onEdit={actions.onEdit}
          onDelete={actions.onDelete}
          showCheckbox={true}
          isSelected={selectedSessions.has(session.id)}
          onToggleSelect={() => onToggleSelect(session.id)}
          onView={actions.onView}
          onPrefetchDetails={actions.onPrefetchDetails}
        />
      ))}
    </TableBody>
  );
}
