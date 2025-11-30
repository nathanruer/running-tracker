import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { type TrainingSession } from '@/lib/types';

interface CompletedSessionRowProps {
  session: TrainingSession;
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
}

export function CompletedSessionRow({ session, onEdit, onDelete }: CompletedSessionRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium text-center">
        {session.sessionNumber}
      </TableCell>
      <TableCell className="text-center">{session.week ?? '-'}</TableCell>
      <TableCell className="text-center">
        {session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '-'}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex flex-col gap-0.5 items-center">
          <span>{session.sessionType}</span>
          {session.intervalStructure && (
            <span className="text-xs text-gradient">
              {session.intervalStructure}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {session.duration}
      </TableCell>
      <TableCell className="text-center">
        {`${session.distance?.toFixed(2) || 0} km`}
      </TableCell>
      <TableCell className="text-center">
        {session.avgPace}
      </TableCell>
      <TableCell className="text-center">
        {`${session.avgHeartRate || 0} bpm`}
      </TableCell>
      <TableCell className="text-center">
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
      <TableCell>
        <p className="whitespace-normal break-words text-sm text-muted-foreground">
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
            <Edit className="h-4 w-4" />
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
