'use client';

import { Card } from '@/components/ui/card';

interface ChatSkeletonProps {
  hasConversation?: boolean;
}

export function ChatSkeleton({ hasConversation = false }: ChatSkeletonProps) {
  return (
    <div className="w-full py-4 md:py-8 px-3 md:px-6 xl:px-12">
      <div className="mx-auto max-w-[90rem]">
        <div className="flex items-center justify-between mb-6 md:hidden px-1">
          <div className="h-9 w-40 bg-muted animate-pulse rounded-lg" />
          <div className="h-10 w-10 bg-muted animate-pulse rounded-xl" />
        </div>

        <div className="flex h-[calc(100vh-12rem)] gap-6">
          <Card className="hidden md:flex w-80 h-full flex-col rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-6 border-b border-border/40">
              <div className="h-7 w-32 bg-muted animate-pulse rounded-lg" />
              <div className="h-9 w-9 bg-muted animate-pulse rounded-xl" />
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
                  <div className="h-10 w-10 bg-muted/20 animate-pulse rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-4 w-3/4 bg-muted/30 animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-muted/20 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex-1 flex flex-col h-full">
            <Card className="h-full flex flex-col rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
              {hasConversation ? (
                <>
                  <div className="border-b border-border/40 px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="h-3 w-16 bg-muted animate-pulse rounded mb-1" />
                      <div className="h-7 w-64 bg-muted animate-pulse rounded-lg" />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <div className="flex justify-end">
                      <div className="bg-muted/50 rounded-2xl px-5 py-3.5 w-[60%]">
                        <div className="h-4 w-full bg-muted/20 animate-pulse rounded" />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-muted/30 rounded-2xl p-6 border border-border/30 space-y-3">
                        <div className="h-4 w-full bg-muted/20 animate-pulse rounded" />
                        <div className="h-4 w-5/6 bg-muted/20 animate-pulse rounded" />
                        <div className="h-4 w-4/6 bg-muted/10 animate-pulse rounded" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-muted/10 rounded-2xl p-6 border border-border/30 space-y-4">
                        <div className="h-4 w-2/3 bg-muted/30 animate-pulse rounded" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                           <div className="h-40 bg-muted/10 animate-pulse rounded-2xl border border-border/40" />
                           <div className="h-40 bg-muted/10 animate-pulse rounded-2xl border border-border/40" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/40 px-8 py-6">
                    <div className="relative">
                      <div className="h-14 w-full bg-muted/20 animate-pulse rounded-2xl" />
                      <div className="absolute right-2 top-2 h-10 w-10 bg-muted/50 animate-pulse rounded-xl" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="w-full max-w-2xl space-y-12">
                    <div className="text-center space-y-4">
                      <div className="h-12 w-4/5 mx-auto bg-muted animate-pulse rounded-xl" />
                      <div className="h-6 w-3/5 mx-auto bg-muted/60 animate-pulse rounded-lg" />
                    </div>

                    <div className="relative w-full">
                      <div className="h-16 w-full bg-muted/20 animate-pulse rounded-2xl" />
                      <div className="absolute right-2 top-2 h-12 w-12 bg-muted/50 animate-pulse rounded-2xl" />
                    </div>
                    
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
