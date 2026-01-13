import React, { useState } from 'react';
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
        className={`text-muted-foreground/70 italic transition-colors ${
          hasIntervalDetails && isOpen
            ? 'bg-muted/20 border-b-0 cursor-pointer'
            : hasIntervalDetails
            ? 'bg-muted/10 border-b-2 border-dashed border-muted-foreground/30 cursor-pointer'
            : 'bg-muted/10 border-b-2 border-dashed border-muted-foreground/30'
        }`}
        onClick={handleRowClick}
      >
        <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="border-muted-foreground/50 data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
              aria-label={`Sélectionner la séance ${session.sessionNumber}`}
            />
          )}
        </TableCell>
        <TableCell className="font-medium text-center whitespace-nowrap">
          {session.sessionNumber}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">{session.week ?? '-'}</TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.date ? new Date(session.date).toLocaleDateString('fr-FR') : (
            <span className="text-muted-foreground/60">À planifier</span>
          )}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          <div className="flex flex-col gap-0.5 items-center">
            <div className="flex items-center gap-1">
              <span>{session.sessionType}</span>
              {hasIntervalDetails && (
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </div>
            {(session.intervalDetails?.workoutType || session.intervalDetails) && (
              <span className="text-xs text-gradient font-medium pr-1">
                {session.intervalDetails?.workoutType || generateIntervalStructure(session.intervalDetails)}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {displayDuration > 0 ? (
            <span>
              ~{formatDuration(Math.round(displayDuration) * 60)}
            </span>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {displayDistance > 0 ? (
            <>
              ~{displayDistance.toFixed(2)} <span className="text-xs">km</span>
            </>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {globalPace !== '-' ? (
            <>
              {globalPace} <span className="text-xs">/km</span>
            </>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {globalHRDisplay !== '-' ? (
            <>
              {globalHRDisplay} <span className="text-xs">bpm</span>
            </>
          ) : '-'}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.targetRPE ? (
            <span className="text-muted-foreground/80">
              {session.targetRPE}/10
            </span>
          ) : '-'}
        </TableCell>
        <CommentCell
          comment={session.comments}
          className="text-muted-foreground/70"
          onShowMore={() => onView?.(session)}
        />
        <TableCell onClick={(e) => e.stopPropagation()}>
          <SessionRowActions
            session={session}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            isPlanned={true}
          />
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
