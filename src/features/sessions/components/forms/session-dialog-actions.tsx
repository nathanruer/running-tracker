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
    <div className="flex gap-4 pt-6">
      <Button
        data-testid="btn-session-cancel"
        type="button"
        variant="ghost"
        onClick={onCancel}
        className="flex-1 h-11 px-6 rounded-2xl font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all"
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
            className="flex-1 h-11 px-6 rounded-2xl font-bold active:scale-95 transition-all"
            disabled={loading}
          >
            {loading ? 'Modification...' : 'Modifier'}
          </Button>
          <Button 
            data-testid="btn-session-submit" 
            type="submit" 
            className="flex-[2] h-11 px-8 rounded-2xl font-black bg-violet-600 hover:bg-violet-700 text-white shadow-none active:scale-95 transition-all" 
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Valider la séance'}
          </Button>
        </>
      ) : (
        <Button 
          data-testid="btn-session-submit" 
          type="submit" 
          className="flex-[2] h-11 px-8 rounded-2xl font-black bg-violet-600 hover:bg-violet-700 text-white shadow-none active:scale-95 transition-all" 
          disabled={loading}
        >
          {loading ? 'Enregistrement...' : hasSession ? 'Mettre à jour' : 'Enregistrer la séance'}
        </Button>
      )}
    </div>
  );
}
