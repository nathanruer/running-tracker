import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionsTableFooterProps {
  hasMore: boolean;
  sessionsCount: number;
  isFetchingNextPage: boolean;
  onLoadMore?: () => void;
}

export function SessionsTableFooter({
  hasMore,
  sessionsCount,
  isFetchingNextPage,
  onLoadMore,
}: SessionsTableFooterProps) {
  if (!hasMore && sessionsCount <= 10) return null;

  return (
    <div className="mt-8 mb-12 flex flex-col items-center justify-center w-full">
      {hasMore && (
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4 text-center">
          <Button
            type="button"
            variant="neutral"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className={cn(
              "group h-10 md:h-12 px-8 rounded-xl transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50",
              "border-border/40 bg-muted/10 hover:bg-muted/20"
            )}
          >
            <div className="flex items-center gap-3">
              {isFetchingNextPage ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90 text-muted-foreground" />
              )}
              <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em]">
                {isFetchingNextPage ? 'Chargement...' : 'Afficher plus de séances'}
              </span>
            </div>
          </Button>

          {isFetchingNextPage && (
            <div className="w-full space-y-3 animate-in fade-in duration-500 max-w-md">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 opacity-30">
                  <div className="h-10 w-10 bg-muted/20 animate-pulse rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2 text-left">
                    <div className="h-4 w-1/3 bg-muted/20 animate-pulse rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasMore && sessionsCount > 10 && (
        <div className="flex flex-col items-center gap-3 opacity-20">
          <div className="h-px w-16 bg-muted-foreground/30" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Fin de l&apos;historique
          </span>
        </div>
      )}
    </div>
  );
}
