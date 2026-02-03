import { FilterX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { SessionRow } from './session-row';
import type { TrainingSession } from '@/lib/types';

interface SessionsTableBodyProps {
  initialLoading: boolean;
  sessions: TrainingSession[];
  isFetching?: boolean;
  selectedSessions: Set<string>;
  onToggleSelect: (id: string) => void;
  actions: {
    onEdit: (session: TrainingSession) => void;
    onDelete: (id: string) => void;
    onView?: (session: TrainingSession) => void;
  };
}

function SessionsTableSkeleton() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <TableRow key={i} className="border-border/20 p-8">
          <TableCell className="px-6"><div className="h-4 w-4 animate-pulse rounded bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell className="hidden sm:table-cell"><div className="h-6 w-8 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell className="hidden lg:table-cell"><div className="h-6 w-8 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell><div className="h-6 w-24 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell>
            <div className="flex flex-col gap-1.5 items-center">
              <div className="h-5 w-32 animate-pulse rounded-lg bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
              <div className="h-3 w-20 animate-pulse rounded-lg bg-muted/50" style={{ animationDelay: `${i * 100}ms` }} />
            </div>
          </TableCell>
          <TableCell><div className="h-6 w-16 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell><div className="h-6 w-16 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell><div className="h-6 w-16 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell><div className="h-6 w-16 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell><div className="h-6 w-10 animate-pulse rounded-lg bg-muted mx-auto" style={{ animationDelay: `${i * 100}ms` }} /></TableCell>
          <TableCell className="min-w-[320px] px-8 hidden xl:table-cell">
            <div className="flex flex-col gap-2">
              <div className="h-3.5 w-[90%] animate-pulse rounded-full bg-muted/60" style={{ animationDelay: `${i * 100}ms` }} />
              <div className="h-3.5 w-[75%] animate-pulse rounded-full bg-muted/40" style={{ animationDelay: `${i * 100}ms` }} />
            </div>
          </TableCell>
          <TableCell>
            <div className="flex justify-center">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" style={{ animationDelay: `${i * 100}ms` }} />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function SessionsEmptyState({ isFetching }: { isFetching?: boolean }) {
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
            <p className="text-sm font-bold text-foreground">Aucun résultat trouvé</p>
            <p className="text-xs text-muted-foreground">
              Essayez de modifier vos filtres ou utilisez le bouton réinitialiser en haut.
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
  selectedSessions,
  onToggleSelect,
  actions,
}: SessionsTableBodyProps) {
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
        <SessionsEmptyState isFetching={isFetching} />
      </TableBody>
    );
  }

  return (
    <TableBody>
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          onEdit={actions.onEdit}
          onDelete={actions.onDelete}
          showCheckbox={true}
          isSelected={selectedSessions.has(session.id)}
          onToggleSelect={() => onToggleSelect(session.id)}
          onView={actions.onView}
        />
      ))}
    </TableBody>
  );
}
