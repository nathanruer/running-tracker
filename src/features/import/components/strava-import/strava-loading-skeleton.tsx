import type { StravaLoadingSkeletonProps } from './types';

export function StravaLoadingSkeleton({ rows = 6 }: StravaLoadingSkeletonProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background">
      <div className="px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-border/10">
        <div className="h-9 w-full md:w-[320px] bg-muted/10 animate-pulse rounded-xl" />
        <div className="h-8 w-24 bg-muted/10 animate-pulse rounded-xl ml-auto" />
      </div>
      <div className="p-4 md:p-8 space-y-4">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 opacity-40">
            <div className="h-10 w-10 bg-muted/10 animate-pulse rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-muted/10 animate-pulse rounded-lg" />
              <div className="h-3 w-1/4 bg-muted/5 animate-pulse rounded-md" />
            </div>
            <div className="h-8 w-16 bg-muted/5 animate-pulse rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StravaLoadingMoreSkeleton() {
  return (
    <div className="w-full space-y-4 px-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 opacity-40">
          <div className="h-10 w-10 bg-muted/10 animate-pulse rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-muted/10 animate-pulse rounded-lg" />
          </div>
          <div className="h-8 w-16 bg-muted/5 animate-pulse rounded-lg" />
        </div>
      ))}
    </div>
  );
}
