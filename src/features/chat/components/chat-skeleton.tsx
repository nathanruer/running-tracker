'use client';

export function ChatSkeleton() {
  return (
    <div className="w-full h-full md:py-8 px-0 md:px-6 xl:px-12 flex flex-col overflow-hidden bg-background">
      <div className="mx-auto w-full max-w-[90rem] h-full flex flex-col relative min-h-0">
        <div className="flex items-center justify-between px-6 py-6 md:hidden shrink-0">
          <div className="h-9 w-40 bg-muted/20 animate-pulse rounded-lg" />
          <div className="h-11 w-11 bg-muted/20 animate-pulse rounded-full" />
        </div>

        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          <div className="hidden md:flex w-80 h-full flex-col bg-card/50 rounded-xl border border-border/50 overflow-hidden">
            <div className="px-6 py-6 border-b border-border/40">
              <div className="h-7 w-32 bg-muted/20 animate-pulse rounded-lg" />
            </div>
            <div className="flex-1 p-4 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted/10 animate-pulse rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 bg-muted/20 animate-pulse rounded" />
                    <div className="h-2 w-1/2 bg-muted/10 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-full flex flex-col bg-transparent relative">
              <div className="flex-1 p-6 md:p-8 space-y-8 overflow-hidden">
                <div className="flex justify-end">
                  <div className="bg-muted/10 rounded-2xl px-5 py-4 w-[40%] animate-pulse" />
                </div>
                <div className="bg-muted/5 rounded-2xl p-6 border border-border/10 space-y-3 animate-pulse">
                  <div className="h-4 w-full bg-muted/10 rounded" />
                  <div className="h-4 w-5/6 bg-muted/10 rounded" />
                </div>
              </div>

              <div className="p-4 md:p-6">
                <div className="h-14 w-full max-w-4xl mx-auto bg-muted/10 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
