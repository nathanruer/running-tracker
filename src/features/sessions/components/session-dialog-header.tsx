import { RotateCcw } from 'lucide-react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SessionDialogHeaderProps {
  mode: 'create' | 'edit' | 'complete';
  onReset: () => void;
}

export function SessionDialogHeader({ mode, onReset }: SessionDialogHeaderProps) {
  const title = mode === 'complete'
    ? 'Enregistrer la séance'
    : mode === 'edit'
    ? 'Modifier la séance'
    : 'Ajouter une séance';

  const description = mode === 'complete'
    ? 'Remplissez les détails de votre séance réalisée'
    : mode === 'edit'
    ? 'Modifiez les informations de votre séance'
    : 'Enregistrez votre séance d\'entraînement';

  return (
    <DialogHeader>
      <DialogTitle className="text-gradient">
        {title}
      </DialogTitle>
      <div className="flex items-center justify-between gap-4">
        <DialogDescription>
          {description}
        </DialogDescription>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Réinitialiser
        </Button>
      </div>
    </DialogHeader>
  );
}
