import { Plus, Trophy } from 'lucide-react';
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
      "relative overflow-hidden rounded-[2.5rem] border-none bg-card p-16 md:p-24 text-center shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700",
      className
    )}>

      <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto space-y-8">
        <div className="relative">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-muted/20 text-muted-foreground/60">
            <Trophy className="h-9 w-9" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground/90">
            Votre aventure commence ici
          </h2>
          <p className="text-base md:text-lg text-muted-foreground/40 font-medium leading-relaxed max-w-md mx-auto">
            Votre historique est encore vierge. Enregistrez vos premières performances pour suivre vos progrès.
          </p>
        </div>
        
        <div className="pt-6">
          <Button 
            data-testid="btn-add-first-session"
            onClick={onAction} 
            variant="action"
            size="xl"
            className="h-12 px-8 rounded-2xl transition-all group"
          >
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 group-hover:scale-110 transition-transform duration-300 shrink-0" />
            <span className="leading-none">Ajouter ma première séance</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
