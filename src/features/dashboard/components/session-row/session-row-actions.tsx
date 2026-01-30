import { MoreVertical, Eye, Edit, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type TrainingSession } from '@/lib/types';

interface SessionRowActionsProps {
  session: TrainingSession;
  onView?: (session: TrainingSession) => void;
  onEdit: (session: TrainingSession) => void;
  onDelete: (id: string) => void;
  isPlanned?: boolean;
}

export function SessionRowActions({
  session,
  onView,
  onEdit,
  onDelete,
  isPlanned = false,
}: SessionRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions de session</DropdownMenuLabel>
        <DropdownMenuItem
          data-testid="session-action-view"
          onClick={() => onView?.(session)}
        >
          <Eye className="h-4 w-4" />
          Voir les détails
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="session-action-edit"
          onClick={() => onEdit(session)}
        >
          {isPlanned ? (
            <>
              <CheckCircle className="h-4 w-4 text-primary" />
              Compléter / Modifier
            </>
          ) : (
            <>
              <Edit className="h-4 w-4" />
              Modifier la séance
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="session-action-delete"
          onClick={() => onDelete(session.id)}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
