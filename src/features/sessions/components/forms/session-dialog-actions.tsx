import { Button } from '@/components/ui/button';

interface SessionDialogActionsProps {
  mode: 'create' | 'edit' | 'complete';
  loading: boolean;
  hasSession: boolean;
  onCancel: () => void;
  onUpdate?: () => void;
}

export function SessionDialogActions({
  mode,
  loading,
  hasSession,
  onCancel,
  onUpdate,
}: SessionDialogActionsProps) {
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
      {mode === 'complete' && onUpdate ? (
        <>
          <Button
            key="btn-update"
            data-testid="btn-session-update"
            type="button"
            variant="secondary"
            size="xl"
            onClick={onUpdate}
            className="w-full sm:flex-1 uppercase text-xs tracking-widest transition-none"
            disabled={loading}
          >
            {loading ? 'Modification...' : 'Modifier'}
          </Button>
          <Button 
            key="btn-submit-complete"
            data-testid="btn-session-submit" 
            type="submit" 
            variant="action"
            size="xl"
            className="w-full sm:flex-[2] px-8 transition-none" 
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Valider la séance'}
          </Button>
        </>
      ) : (
        <Button 
          key="btn-submit-default"
          data-testid="btn-session-submit" 
          type="submit" 
          variant="action"
          size="xl"
          className="w-full sm:flex-[2] px-8 transition-none" 
          disabled={loading}
        >
          {loading ? 'Enregistrement...' : hasSession ? 'Mettre à jour' : 'Enregistrer la séance'}
        </Button>
      )}
    </div>
  );
}
