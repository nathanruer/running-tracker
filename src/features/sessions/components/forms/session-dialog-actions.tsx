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
    <div className="flex gap-3 pt-4">
      <Button
        data-testid="btn-session-cancel"
        type="button"
        variant="outline"
        onClick={onCancel}
        className="flex-1 font-semibold active:scale-95 transition-all mb-4 sm:mb-0"
      >
        Annuler
      </Button>
      {mode === 'complete' && onUpdate ? (
        <>
          <Button
            data-testid="btn-session-update"
            type="button"
            variant="secondary"
            onClick={onUpdate}
            className="flex-1 font-semibold active:scale-95 transition-all"
            disabled={loading}
          >
            {loading ? 'Modification...' : 'Modifier'}
          </Button>
          <Button data-testid="btn-session-submit" type="submit" className="flex-2 font-bold bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Modifier et marquer comme réalisé'}
          </Button>
        </>
      ) : (
        <Button data-testid="btn-session-submit" type="submit" className="flex-1 font-bold bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all" disabled={loading}>
          {loading ? 'Enregistrement...' : hasSession ? 'Modifier' : 'Enregistrer'}
        </Button>
      )}
    </div>
  );
}
