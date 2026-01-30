import { Button } from '@/components/ui/button';

interface SessionDialogActionsProps {
  mode: 'create' | 'edit' | 'complete';
  loading: boolean;
  hasSession: boolean;
  onCancel: () => void;
  primaryLabel?: string;
}

export function SessionDialogActions({
  mode,
  loading,
  hasSession,
  onCancel,
  primaryLabel,
}: SessionDialogActionsProps) {
  const defaultLabel = loading 
    ? 'Enregistrement...' 
    : mode === 'complete' 
    ? 'Valider la séance'
    : hasSession 
    ? 'Mettre à jour' 
    : 'Enregistrer la séance';

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6">
      <Button
        data-testid="btn-session-cancel"
        type="button"
        variant="neutral"
        size="xl"
        onClick={onCancel}
        className="w-full sm:flex-1"
      >
        Annuler
      </Button>
      <Button 
        key="btn-session-submit"
        data-testid="btn-session-submit" 
        type="submit" 
        variant="action"
        size="xl"
        className="w-full sm:flex-[2] px-8 transition-none" 
        disabled={loading}
      >
        {primaryLabel || defaultLabel}
      </Button>
    </div>
  );
}
