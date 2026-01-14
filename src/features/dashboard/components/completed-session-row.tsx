import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { type TrainingSession } from '@/lib/types';
import { normalizeDurationFormat } from '@/lib/utils/duration';
import { IntervalDetailsView } from './interval-details-view';
import { CommentCell } from './comment-cell';
import { SessionRowActions } from './session-row-actions';

interface CompletedSessionRowProps {
  session: TrainingSession;
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView?: (session: TrainingSession) => void;
}

export const CompletedSessionRow = React.memo(function CompletedSessionRow({
  session,
  onEdit,
  onDelete,
  showCheckbox = false,
  isSelected = false,
  onToggleSelect,
  onView
}: CompletedSessionRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasIntervalDetails = session.sessionType === 'Fractionné' && !!session.intervalDetails;

  const handleRowClick = () => {
    if (hasIntervalDetails) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      <TableRow
        className={cn(
          "transition-colors group/row",
          isSelected 
            ? 'bg-violet-500/5' 
            : hasIntervalDetails && isOpen 
            ? 'bg-muted/50 border-b-0 cursor-pointer' 
            : hasIntervalDetails 
            ? 'cursor-pointer' 
            : ''
        )}
        onClick={handleRowClick}
      >
        <TableCell className="w-12 px-6" onClick={(e) => e.stopPropagation()}>
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className={cn(
                "transition-all duration-300",
                isSelected 
                  ? "border-violet-500/50 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500" 
                  : "border-muted-foreground/30 data-[state=checked]:bg-muted-foreground/40 data-[state=checked]:border-muted-foreground/40"
              )}
              aria-label={`Sélectionner la séance ${session.sessionNumber}`}
            />
          )}
        </TableCell>
        <TableCell className="font-semibold text-center whitespace-nowrap text-muted-foreground/40">
          {session.sessionNumber}
        </TableCell>
        <TableCell className="text-center font-semibold whitespace-nowrap text-muted-foreground/30 tracking-tight">{session.week ?? '-'}</TableCell>
        <TableCell className="text-center font-semibold tracking-tight whitespace-nowrap text-muted-foreground/40">
          {session.date ? new Date(session.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap px-4">
          <div className="flex flex-col gap-0.5 items-center">
            <div className="flex items-center gap-1.5 group/title">
              <span className="font-bold tracking-tight text-foreground/90">{session.sessionType}</span>
              {hasIntervalDetails && (
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/40 transition-all duration-300 group-hover/title:text-foreground/60",
                    isOpen ? 'rotate-180 text-foreground/60' : ''
                  )}
                />
              )}
            </div>
            {session.intervalDetails?.workoutType && (
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                {session.intervalDetails.workoutType}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.duration ? (
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="font-semibold tabular-nums text-foreground/100 text-[15px]">{normalizeDurationFormat(session.duration) || session.duration}</span>
            </div>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.distance ? (
            <div className="flex items-baseline justify-center gap-0.5 group/metric">
              <span className="font-semibold tabular-nums text-foreground/100 text-[15px]">{session.distance.toFixed(1)}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 group-hover/metric:text-muted-foreground/60 transition-colors">km</span>
            </div>
          ) : (
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="font-semibold tabular-nums text-muted-foreground/20">0.0</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/10">km</span>
            </div>
          )}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          <div className="flex items-baseline justify-center gap-0.5 group/metric">
            <span className="font-semibold tabular-nums text-foreground/100 text-[15px]">{session.avgPace}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 group-hover/metric:text-muted-foreground/60 transition-colors">/km</span>
          </div>
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.avgHeartRate ? (
            <div className="flex items-baseline justify-center gap-0.5 group/metric">
              <span className="font-semibold tabular-nums text-foreground/100 text-[15px]">{session.avgHeartRate}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 group-hover/metric:text-muted-foreground/60 transition-colors">bpm</span>
            </div>
          ) : (
            <span className="text-muted-foreground/10">-</span>
          )}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.perceivedExertion ? (
            <div className="flex items-center justify-center">
              <span className={cn(
                "text-[15px] font-bold tracking-tight",
                session.perceivedExertion <= 3 ? 'text-emerald-500/90' :
                session.perceivedExertion <= 6 ? 'text-amber-500/90' :
                session.perceivedExertion <= 8 ? 'text-orange-500/90' :
                'text-rose-500/90'
              )}>
                {session.perceivedExertion}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground/10">-</span>
          )}
        </TableCell>
        <CommentCell
          comment={session.comments}
          onShowMore={() => onView?.(session)}
        />
        <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center">
            <SessionRowActions
              session={session}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              isPlanned={false}
            />
          </div>
        </TableCell>
      </TableRow>

      {hasIntervalDetails && isOpen && (
        <TableRow>
          <TableCell colSpan={12} className="bg-muted/50 p-2">
            <IntervalDetailsView
              intervalDetails={session.intervalDetails!}
              isPlanned={false}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
