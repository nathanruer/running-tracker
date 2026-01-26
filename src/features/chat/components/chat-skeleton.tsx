'use client';

interface ChatSkeletonProps {
  mode?: 'landing' | 'conversation';
}

export function ChatSkeleton({ mode = 'landing' }: ChatSkeletonProps) {
  return (
    <div className="w-full h-full md:py-8 px-0 md:px-6 xl:px-12 flex flex-col overflow-hidden bg-background">
      <div className="mx-auto w-full max-w-[90rem] h-full flex flex-col relative min-h-0">
        
        {/* Mobile Header Skeleton */}
        <div className="flex items-center justify-between px-6 py-4 md:hidden shrink-0 border-b border-border/10">
          <div className="h-8 w-32 bg-muted/20 animate-pulse rounded-lg" />
          <div className="h-10 w-10 bg-muted/10 animate-pulse rounded-xl" />
        </div>

        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden pt-0">
          
          {/* Sidebar Skeleton (Conversations) */}
          <div className="hidden md:flex w-80 h-full flex-col bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden shadow-xl">
            {/* Sidebar Title */}
            <div className="px-6 py-7 md:px-6 shrink-0">
              <div className="h-7 w-32 bg-muted/20 animate-pulse rounded-lg" />
            </div>

            {/* "Nouveau Chat" Button Skeleton */}
            <div className="px-4 mb-4">
              <div className="h-11 w-full bg-violet-600/20 animate-pulse rounded-2xl border border-violet-600/10" />
            </div>

            {/* Divider */}
            <div className="px-4 mb-2">
              <div className="h-px w-full bg-border/40" />
            </div>

            {/* Conversation List Skeleton */}
            <div className="flex-1 p-4 space-y-2 overflow-hidden">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-transparent">
                  <div className="h-4 w-4 bg-muted/10 animate-pulse rounded-md shrink-0" />
                  <div className="h-3 w-40 bg-muted/10 animate-pulse rounded-md" />
                  <div className="ml-auto h-4 w-1 bg-muted/5 animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Main Chat Area Skeleton */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="h-full flex flex-col bg-transparent relative overflow-hidden">
              
              {mode === 'landing' ? (
                /* Empty State Hero Skeleton (Match image 1) */
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center">
                  <div className="max-w-md space-y-4">
                    <div className="space-y-2">
                        <div className="h-10 md:h-14 w-64 md:w-80 bg-muted/20 animate-pulse rounded-2xl mx-auto" />
                        <div className="h-10 md:h-14 w-48 md:w-64 bg-violet-600/10 animate-pulse rounded-2xl mx-auto" />
                    </div>
                    <div className="space-y-2 pt-2">
                        <div className="h-3 w-64 md:w-96 bg-muted/10 animate-pulse rounded-md mx-auto" />
                        <div className="h-3 w-48 md:w-72 bg-muted/10 animate-pulse rounded-md mx-auto" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Conversation Skeleton (Bubbles) */
                <div className="flex-1 p-6 md:p-10 space-y-8 overflow-hidden">
                  <div className="flex justify-end pr-4 md:pr-12">
                     <div className="h-14 w-[50%] md:w-[35%] bg-violet-600/20 animate-pulse rounded-2xl md:rounded-3xl border border-violet-600/10" />
                  </div>
                  <div className="flex justify-start pl-0 md:pl-4">
                     <div className="h-32 w-[90%] md:w-[70%] bg-muted/10 animate-pulse rounded-2xl md:rounded-3xl border border-border/20" />
                  </div>
                  <div className="flex justify-end pr-4 md:pr-12">
                     <div className="h-12 w-[35%] md:w-[25%] bg-violet-600/20 animate-pulse rounded-2xl md:rounded-3xl border border-violet-600/10" />
                  </div>
                </div>
              )}

              {/* Chat Input Area Skeleton */}
              <div className="shrink-0 w-full p-4 md:p-6 bg-background">
                <div className="h-14 w-full max-w-4xl mx-auto bg-muted/5 border border-border/20 rounded-full animate-pulse flex items-center px-6 justify-between shadow-xl">
                   <div className="h-4 w-64 bg-muted/10 rounded-md" />
                   <div className="h-10 w-10 bg-violet-600/10 rounded-full border border-violet-600/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
