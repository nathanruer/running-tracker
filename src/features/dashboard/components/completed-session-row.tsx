'use client';

import { useState } from 'react';
import { Edit, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { type TrainingSession } from '@/lib/types';
import { IntervalDetailsView } from './interval-details-view';
import { CommentCell } from './comment-cell';

interface CompletedSessionRowProps {
  session: TrainingSession;
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function CompletedSessionRow({
  session,
  onEdit,
  onDelete,
  showCheckbox = false,
  isSelected = false,
  onToggleSelect
}: CompletedSessionRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasIntervalDetails = session.sessionType === 'Fractionné' && session.intervalDetails;

  return (
    <>
      <TableRow
        className={
          hasIntervalDetails
            ? isOpen
              ? 'bg-muted/50 border-b-0 hover:bg-muted/50 cursor-pointer'
              : 'cursor-pointer hover:bg-transparent'
            : 'hover:bg-transparent'
        }
        onClick={hasIntervalDetails ? () => setIsOpen(!isOpen) : undefined}
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
          {session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '-'}
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
            {session.intervalDetails?.workoutType && (
              <span className="text-xs text-gradient">
                {session.intervalDetails.workoutType}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.duration}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.distance ? (
            <>
              {session.distance.toFixed(2)} <span className="text-xs text-muted-foreground">km</span>
            </>
          ) : (
            <>
              0 <span className="text-xs text-muted-foreground">km</span>
            </>
          )}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.avgPace} <span className="text-xs text-muted-foreground">mn/km</span>
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.avgHeartRate ? (
            <>
              {session.avgHeartRate} <span className="text-xs text-muted-foreground">bpm</span>
            </>
          ) : (
            <>
              0 <span className="text-xs text-muted-foreground">bpm</span>
            </>
          )}
        </TableCell>
        <TableCell className="text-center whitespace-nowrap">
          {session.perceivedExertion ? (
            <span className={
              session.perceivedExertion <= 3 ? 'text-green-500' :
              session.perceivedExertion <= 6 ? 'text-yellow-500' :
              session.perceivedExertion <= 8 ? 'text-orange-500' :
              'text-red-500 font-bold'
            }>
              {session.perceivedExertion}/10
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <CommentCell comment={session.comments} />
        <TableCell>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(session);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {hasIntervalDetails && isOpen && (
        <TableRow className="hover:bg-transparent">
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
}
