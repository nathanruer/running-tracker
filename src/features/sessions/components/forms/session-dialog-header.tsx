import { RotateCcw, X } from 'lucide-react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
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
    <DialogHeader className="relative">
      <div className="flex items-start justify-between">
        <DialogTitle className="text-2xl font-bold tracking-tight">
          {title}
        </DialogTitle>
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogClose>
      </div>
      <div className="flex items-center justify-between gap-4 mt-1">
        <DialogDescription className="text-sm text-muted-foreground/70 font-medium">
          {description}
        </DialogDescription>
        <Button
          data-testid="btn-session-reset"
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 hover:text-red-600 hover:bg-red-500/5 transition-all shrink-0 border border-transparent hover:border-red-500/10"
        >
          <RotateCcw className="mr-1.5 h-3 w-3" />
          Réinitialiser
        </Button>
      </div>
    </DialogHeader>
  );
}
