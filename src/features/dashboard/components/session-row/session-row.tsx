import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { TableCell, TableRow } from '@/components/ui/table';
import { IntervalDetailsView } from '../interval-details-view';
import { CommentCell } from './comment-cell';
import { SessionRowActions } from './session-row-actions';
import { useSessionRowData } from '@/features/dashboard/hooks/use-session-row-data';
import {
  CheckboxCell,
  SessionTypeCell,
  DateCell,
  MetricCell,
  RPECell,
} from './session-row-cells';
import type { SessionRowProps } from './types';

/**
 * Unified session row component for both completed and planned sessions.
 * Uses the session status to determine styling and data display.
 */
export const SessionRow = React.memo(function SessionRow({
  session,
  onEdit,
  onDelete,
  showCheckbox = false,
  isSelected = false,
  onToggleSelect,
  onView,
}: SessionRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const data = useSessionRowData(session);
  
  const handleRowClick = () => {
    if (data.hasIntervalDetails) {
      setIsOpen(!isOpen);
    }
  };

  const rowClassName = cn(
    "transition-colors group/row",
    data.isPlanned && "text-muted-foreground/70 italic bg-muted/[0.01]",
    isSelected 
      ? 'bg-violet-500/5'
      : data.hasIntervalDetails && isOpen
        ? data.isPlanned 
          ? 'bg-muted/30 border-b-0 cursor-pointer'
          : 'bg-muted/50 border-b-0 cursor-pointer'
        : data.hasIntervalDetails
          ? data.isPlanned
            ? 'bg-muted/10 border-b border-dashed border-border/40 cursor-pointer'
            : 'cursor-pointer'
          : data.isPlanned
            ? 'bg-muted/10 border-b border-dashed border-border/40'
            : ''
  );

  const intervalRowClassName = data.isPlanned
    ? "bg-muted/30 border-b-2 border-dashed border-muted-foreground/30 p-2 text-muted-foreground/70"
    : "bg-muted/50 p-2";

  return (
    <>
      <TableRow data-testid={`session-row-${session.id}`} className={rowClassName} onClick={handleRowClick}>
        <CheckboxCell
          showCheckbox={showCheckbox}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          sessionNumber={session.sessionNumber}
        />
        
        <TableCell className="font-semibold text-center whitespace-nowrap text-muted-foreground/40 hidden sm:table-cell">
          {session.sessionNumber}
        </TableCell>
        
        <TableCell className="text-center font-semibold whitespace-nowrap text-muted-foreground/30 tracking-tight hidden lg:table-cell">
          {session.week ?? '-'}
        </TableCell>
        
        <DateCell 
          dateDisplay={data.dateDisplay} 
          isPlanned={data.isPlanned} 
        />
        
        <SessionTypeCell
          sessionType={session.sessionType}
          hasIntervalDetails={data.hasIntervalDetails}
          isOpen={isOpen}
          isPlanned={data.isPlanned}
          workoutTypeLabel={data.workoutTypeLabel}
          intervalStructure={data.intervalStructure}
        />
        
        <MetricCell
          value={data.duration}
          isPlanned={data.isPlanned}
          showApprox={data.isPlanned && data.duration !== '-'}
        />
        
        <MetricCell
          value={data.distance}
          unit="km"
          isPlanned={data.isPlanned}
          showApprox={data.isPlanned && data.distance !== '-'}
        />
        
        <MetricCell
          value={data.pace}
          unit="/km"
          isPlanned={data.isPlanned}
          showApprox={data.isPlanned && data.pace !== '-'}
        />
        
        <MetricCell
          value={data.heartRate}
          unit="bpm"
          isPlanned={data.isPlanned}
          showApprox={data.isPlanned && data.heartRate !== '-'}
        />
        
        <RPECell
          rpe={data.rpe}
          rpeColor={data.rpeColor}
        />
        
        <CommentCell
          comment={session.comments}
          isPlanned={data.isPlanned}
          onShowMore={() => onView?.(session)}
          className="hidden xl:table-cell"
        />
        
        <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
          <div className={cn(
            "flex justify-center",
            data.isPlanned && "opacity-40 group-hover/row:opacity-100 transition-opacity"
          )}>
            <SessionRowActions
              session={session}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              isPlanned={data.isPlanned}
            />
          </div>
        </TableCell>
      </TableRow>

      {data.hasIntervalDetails && isOpen && (
        <TableRow>
          <TableCell colSpan={12} className={intervalRowClassName}>
            <IntervalDetailsView
              intervalDetails={session.intervalDetails!}
              isPlanned={data.isPlanned}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
});
