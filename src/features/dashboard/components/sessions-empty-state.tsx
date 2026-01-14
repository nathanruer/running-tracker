import { Plus, Trophy, Zap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SessionsEmptyStateProps {
  onAction: () => void;
  className?: string;
}

export function SessionsEmptyState({ onAction, className }: SessionsEmptyStateProps) {
  return (
    <div 
      data-testid="sessions-empty-state"
      className={cn(
      "relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/30 p-12 text-center backdrop-blur-sm",
      "before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05),transparent)]",
      className
    )}>
      <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/5 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-64 h-64 bg-violet-500/5 blur-3xl rounded-full" />

      <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-violet-600/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-violet-500/20 rotate-3 transform hover:rotate-0 transition-transform duration-500">
            <Trophy className="h-10 w-10" />
            
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-xl bg-background/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center text-violet-600 -rotate-12 animate-bounce">
              <Zap className="h-4 w-4" />
            </div>
            <div className="absolute -bottom-1 -left-3 h-10 w-10 rounded-xl bg-background/80 backdrop-blur-md border border-border shadow-sm flex items-center justify-center text-indigo-600 rotate-12 animate-pulse" style={{ animationDelay: '1s' }}>
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Votre aventure commence ici
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Votre historique est encore vierge. C&apos;est le moment idéal pour commencer à enregistrer vos performances et transformer vos efforts en progrès.
          </p>
          
          <div className="pt-6">
            <Button 
              data-testid="btn-add-first-session"
              onClick={onAction} 
              className="h-14 px-8 rounded-2xl font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25 active:scale-95 transition-all group overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                Ajouter ma première séance
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
