import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionsErrorStateProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function SessionsErrorState({ onRetry, isRetrying }: SessionsErrorStateProps) {
  return (
    <div
      data-testid="sessions-error-state"
      className="relative overflow-hidden rounded-[2.5rem] border-none bg-card p-16 md:p-24 text-center shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto space-y-8">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-rose-500/10 text-rose-500/70">
          <AlertCircle className="h-9 w-9" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground/90">
            Impossible de charger vos séances
          </h2>
          <p className="text-base md:text-lg text-muted-foreground/40 font-medium leading-relaxed max-w-md mx-auto">
            Une erreur est survenue lors de la récupération de votre historique. Vérifiez votre connexion puis réessayez.
          </p>
        </div>

        <div className="pt-6">
          <Button
            data-testid="btn-retry-sessions"
            onClick={onRetry}
            disabled={isRetrying}
            variant="action"
            size="xl"
            className="h-12 px-8 rounded-2xl transition-all group"
          >
            <RotateCw className={`h-5 w-5 mr-2 shrink-0 ${isRetrying ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span className="leading-none">Réessayer</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
