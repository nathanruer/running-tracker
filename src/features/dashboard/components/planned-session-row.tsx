import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { type TrainingSession } from '@/lib/types';
import { generateIntervalStructure, calculateIntervalTotals } from '@/lib/utils/intervals';
import { normalizePaceOrRange, formatDuration } from '@/lib/utils/duration';
import { formatHRDisplay } from '@/lib/utils/hr';
import { IntervalDetailsView } from './interval-details-view';
import { CommentCell } from './comment-cell';
import { SessionRowActions } from './session-row-actions';

interface PlannedSessionRowProps {
  session: TrainingSession;
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onView?: (session: TrainingSession) => void;
}

export const PlannedSessionRow = React.memo(function PlannedSessionRow({ 
  session, 
  onEdit, 
  onDelete, 
  showCheckbox = false,
  isSelected = false,
  onToggleSelect,
  onView
}: PlannedSessionRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasIntervalDetails = session.sessionType === 'Fractionné' && !!session.intervalDetails;

  const handleRowClick = () => {
    if (hasIntervalDetails) {
      setIsOpen(!isOpen);
    }
  };

  const totals = calculateIntervalTotals(session.intervalDetails?.steps);

  const displayDuration = totals.totalDurationMin > 0 
    ? totals.totalDurationMin 
    : session.targetDuration || 0;

  const displayDistance = totals.totalDistanceKm > 0 
    ? totals.totalDistanceKm 
    : session.targetDistance || 0;

  const globalPace = totals.avgPaceFormatted 
    ? `~${totals.avgPaceFormatted}` 
    : (normalizePaceOrRange(session.targetPace) ? `~${normalizePaceOrRange(session.targetPace)}` : '-');

  const globalHRDisplay = formatHRDisplay(
    totals.avgBpm,
    session.targetHeartRateBpm,
    { useApproximation: true, includeUnit: false }
  );

  return (
    <>
      <TableRow
        className={cn(
          "transition-colors text-muted-foreground/60 group/row",
          isSelected
            ? 'bg-violet-500/5'
            : hasIntervalDetails && isOpen
            ? 'bg-muted/30 border-b-0 cursor-pointer'
            : hasIntervalDetails
            ? 'bg-muted/10 border-b border-dashed border-border/40 cursor-pointer'
            : 'bg-muted/10 border-b border-dashed border-border/40'
        )}
        onClick={handleRowClick}
      >
        <TableCell className="w-12 px-6" onClick={(e) => e.stopPropagation()}>
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className={cn(
                "rounded-md transition-all duration-300",
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
          {session.date ? new Date(session.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/20">À planifier</span>
          )}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap px-4">
          <div className="flex flex-col gap-0.5 items-center">
            <div className="flex items-center gap-1.5 group/title">
              <span className="font-bold tracking-tight text-muted-foreground/70">{session.sessionType}</span>
              {hasIntervalDetails && (
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/20 transition-all duration-300 group-hover/title:text-muted-foreground/40",
                    isOpen ? 'rotate-180 text-muted-foreground/40' : ''
                  )}
                />
              )}
            </div>
            {(session.intervalDetails?.workoutType || session.intervalDetails) && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30">
                {session.intervalDetails?.workoutType || generateIntervalStructure(session.intervalDetails)}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {displayDuration > 0 ? (
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-muted-foreground/20 mr-1 italic">~</span>
              <span className="font-semibold tabular-nums text-muted-foreground/70 text-[15px]">{formatDuration(Math.round(displayDuration) * 60)}</span>
            </div>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {displayDistance > 0 ? (
            <div className="flex items-baseline justify-center gap-0.5 group/metric">
              <span className="text-muted-foreground/20 mr-1 italic">~</span>
              <span className="font-semibold tabular-nums text-muted-foreground/70 text-[15px]">{displayDistance.toFixed(1)}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 group-hover/metric:text-muted-foreground/50 transition-colors">km</span>
            </div>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {globalPace !== '-' ? (
            <div className="flex items-baseline justify-center gap-0.5 group/metric">
              <span className="font-semibold tabular-nums text-muted-foreground/70 text-[15px]">{globalPace}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 group-hover/metric:text-muted-foreground/50 transition-colors">/km</span>
            </div>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {globalHRDisplay !== '-' ? (
            <div className="flex items-baseline justify-center gap-0.5 group/metric">
              <span className="font-semibold tabular-nums text-muted-foreground/70 text-[15px]">{globalHRDisplay}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 group-hover/metric:text-muted-foreground/50 transition-colors">bpm</span>
            </div>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.targetRPE ? (
            <div className="flex items-center justify-center">
              <span className="text-[15px] font-bold tracking-tight text-muted-foreground/50">
                {session.targetRPE}
              </span>
            </div>
          ) : '-'}
        </TableCell>
        <CommentCell
          comment={session.comments}
          className="text-muted-foreground/40"
          onShowMore={() => onView?.(session)}
        />
        <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center opacity-40 group-hover/row:opacity-100 transition-opacity">
            <SessionRowActions
              session={session}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              isPlanned={true}
            />
          </div>
        </TableCell>
      </TableRow>

      {hasIntervalDetails && isOpen && (
        <TableRow>
          <TableCell colSpan={12} className="bg-muted/20 border-b-2 border-dashed border-muted-foreground/30 p-2 italic text-muted-foreground/70">
            <IntervalDetailsView
              intervalDetails={session.intervalDetails!}
              isPlanned={true}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
