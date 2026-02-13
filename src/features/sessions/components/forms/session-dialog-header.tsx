import { RotateCcw } from 'lucide-react';
import { CloseButton } from '@/components/ui/close-button';
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
  entryMode?: 'done' | 'planned';
}

export function SessionDialogHeader({ mode, onReset, entryMode = 'done' }: SessionDialogHeaderProps) {
  const isPlanned = entryMode === 'planned';

  const title = mode === 'complete'
    ? (isPlanned ? 'Modifier le plan' : 'Enregistrer la séance')
    : mode === 'edit'
    ? 'Modifier la séance'
    : (isPlanned ? 'Planifier une séance' : 'Ajouter une séance');

  const description = mode === 'complete'
    ? (isPlanned ? 'Mettez à jour les objectifs de la séance planifiée' : 'Remplissez les détails de votre séance réalisée')
    : mode === 'edit'
    ? 'Modifiez les informations de votre séance'
    : (isPlanned ? 'Créez une séance à planifier' : 'Enregistrez votre séance d\'entraînement');

  return (
    <DialogHeader className="relative w-full items-start text-left">
      <div className="flex w-full items-start justify-between gap-4">
        <DialogTitle className="text-2xl font-bold tracking-tight">
          {title}
        </DialogTitle>
        <DialogClose asChild>
          <CloseButton className="-mt-1" />
        </DialogClose>
      </div>
      <div className="flex flex-col sm:flex-row w-full gap-3 md:gap-4 items-start sm:items-center justify-between mt-1">
        <DialogDescription className="text-sm text-muted-foreground/70 font-medium sm:max-w-none text-left">
          {description}
        </DialogDescription>
        <Button
          data-testid="btn-session-reset"
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 w-fit px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 hover:text-red-600 hover:bg-red-500/5 transition-all shrink-0 border border-transparent hover:border-red-500/10 ml-auto sm:ml-0"
        >
          <RotateCcw className="mr-1.5 h-3 w-3" />
          Réinitialiser
        </Button>
      </div>
    </DialogHeader>
  );
}
