import { CheckCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { type TrainingSession } from '@/lib/types';
import { generateIntervalStructure } from '@/lib/utils';

interface PlannedSessionRowProps {
  session: TrainingSession;
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
}

export function PlannedSessionRow({ session, onEdit, onDelete }: PlannedSessionRowProps) {
  return (
    <TableRow
      className="border-b-2 border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground italic hover:bg-muted/20"
    >
      <TableCell className="font-medium text-center">
        <div className="flex flex-col items-center gap-1">
          {session.sessionNumber}
        </div>
      </TableCell>
      <TableCell className="text-center">{session.week ?? '-'}</TableCell>
      <TableCell className="text-center">
        {session.date ? new Date(session.date).toLocaleDateString('fr-FR') : (
          <span className="text-sm">À planifier</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col gap-0.5 items-center">
          <span>{session.sessionType}</span>
          {session.intervalDetails && (
            <span className="text-xs text-gradient">
              {generateIntervalStructure(session.intervalDetails)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {session.targetDuration ? (
          <span>
            ~{Math.floor(session.targetDuration / 60).toString().padStart(2, '0')}:{(session.targetDuration % 60).toString().padStart(2, '0')}:00
          </span>
        ) : '-'}
      </TableCell>
      <TableCell className="text-center">
        {session.targetDistance ? (
          <span>
            ~{session.targetDistance} km
          </span>
        ) : '-'}
      </TableCell>
      <TableCell className="text-center">
        {session.targetPace ? (
          <span>
            ~{session.targetPace}
          </span>
        ) : '-'}
      </TableCell>
      <TableCell className="text-center">
        {session.targetHeartRateBpm || session.targetHeartRateZone ? (
          <span>
            {session.targetHeartRateBpm || session.targetHeartRateZone} bpm
          </span>
        ) : '-'}
      </TableCell>
      <TableCell className="text-center">
        {session.targetRPE ? (
          <span>
            {session.targetRPE}/10
          </span>
        ) : (
          <span>-</span>
        )}
      </TableCell>
      <TableCell>
        <p className="whitespace-normal break-words text-sm">
          {session.comments}
        </p>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(session)}
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(session.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
