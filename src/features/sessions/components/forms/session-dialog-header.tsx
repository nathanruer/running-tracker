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
          data-testid="btn-session-reset"
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/5 transition-all shrink-0 border border-transparent hover:border-red-500/10"
        >
          <RotateCcw className="mr-1.5 h-3 w-3" />
          Réinitialiser le formulaire
        </Button>
      </div>
    </DialogHeader>
  );
}
