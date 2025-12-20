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
        type="button"
        variant="outline"
        onClick={onCancel}
        className="flex-1"
      >
        Annuler
      </Button>
      {mode === 'complete' && onUpdate ? (
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onUpdate}
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Modification...' : 'Modifier'}
          </Button>
          <Button type="submit" className="flex-1 gradient-violet" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Modifier et marquer comme réalisé'}
          </Button>
        </>
      ) : (
        <Button type="submit" className="flex-1 gradient-violet" disabled={loading}>
          {loading ? 'Enregistrement...' : hasSession ? 'Modifier' : 'Enregistrer'}
        </Button>
      )}
    </div>
  );
}
