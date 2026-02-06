import type { InfiniteScrollTriggerProps } from './types';

const DEFAULT_SKELETON = (
  <div className="w-full space-y-2 px-4 md:px-8">
    {[...Array(3)].map((_, i) => (
      <div 
        key={i} 
        className="flex items-center gap-4 p-4 rounded-xl bg-muted/5 animate-pulse"
        style={{ opacity: 1 - (i * 0.25), animationDelay: `${i * 150}ms` }}
      >
        <div className="h-10 w-10 bg-muted/10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/4 bg-muted/10 rounded-full" />
          <div className="h-2 w-1/6 bg-muted/5 rounded-full" />
        </div>
        <div className="h-6 w-12 bg-muted/5 rounded-full" />
      </div>
    ))}
  </div>
);

export function InfiniteScrollTrigger({
  hasMore,
  loading,
  observerRef,
  skeleton = DEFAULT_SKELETON,
}: InfiniteScrollTriggerProps) {
  if (!hasMore) return null;

  return (
    <div ref={observerRef} className="flex flex-col items-center justify-center p-4 w-full min-h-[60px]">
      {loading ? (
        skeleton
      ) : (
        <p className="text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">
          Défilez pour charger plus
        </p>
      )}
    </div>
  );
}
