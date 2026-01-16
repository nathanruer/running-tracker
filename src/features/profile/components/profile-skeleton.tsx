'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/page-container';

export function ProfileSkeleton() {
  return (
    <PageContainer>
      <div className="h-9 w-48 bg-muted animate-pulse rounded-lg mb-6 md:hidden mx-1" />

        <div className="mb-8 flex items-center justify-center sm:justify-between gap-4">
          <div className="flex gap-1 p-1 bg-muted/20 backdrop-blur-md rounded-2xl w-fit border border-border/40 font-medium">
            <div className="h-9 w-24 sm:w-32 bg-muted animate-pulse rounded-xl" />
            <div className="h-9 w-24 sm:w-32 bg-muted animate-pulse rounded-xl" />
            <div className="h-9 w-24 sm:w-32 bg-muted animate-pulse rounded-xl" />
          </div>
          <div className="hidden md:block h-9 w-40 bg-muted animate-pulse rounded-xl" />
        </div>

        <div className="grid gap-8 lg:grid-cols-2 items-start">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
            <CardHeader className="space-y-2">
              <div className="h-7 w-48 bg-muted animate-pulse rounded-lg" />
              <div className="h-4 w-full bg-muted/60 animate-pulse rounded" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="h-3 w-12 bg-muted animate-pulse rounded ml-1" />
                <div className="h-10 w-full bg-muted/30 animate-pulse rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-32 bg-muted animate-pulse rounded ml-1" />
                <div className="h-32 w-full bg-muted/30 animate-pulse rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded ml-1" />
                    <div className="h-10 w-full bg-muted/30 animate-pulse rounded-xl" />
                  </div>
                ))}
              </div>
              <div className="h-10 w-full bg-muted animate-pulse rounded-xl mt-4" />
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
              <CardHeader className="space-y-2">
                <div className="h-7 w-40 bg-muted animate-pulse rounded-lg" />
                <div className="h-4 w-64 bg-muted/60 animate-pulse rounded" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40 h-[68px]">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted/60 animate-pulse rounded" />
                  </div>
                  <div className="h-6 w-16 bg-muted/40 animate-pulse rounded-full" />
                </div>
                <div className="h-9 w-full bg-muted/30 animate-pulse rounded-md" />
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
              <CardHeader className="space-y-2">
                <div className="h-7 w-48 bg-muted animate-pulse rounded-lg" />
                <div className="h-4 w-64 bg-muted/60 animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <div className="h-12 w-full bg-muted/30 animate-pulse border-b border-border/50" />
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-[53px] w-full bg-transparent border-b border-border/50 last:border-0 flex items-center px-4">
                        <div className="h-4 w-full bg-muted/10 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </PageContainer>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 w-64 bg-muted/40 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 bg-muted/40 rounded-3xl" />
        <div className="h-32 bg-muted/40 rounded-3xl" />
        <div className="h-32 bg-muted/40 rounded-3xl" />
      </div>
      <div className="h-80 bg-muted/40 rounded-3xl" />
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-96 bg-muted/40 rounded-3xl" />
    </div>
  );
}
