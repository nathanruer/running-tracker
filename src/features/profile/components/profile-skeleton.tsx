import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageContainer } from '@/components/layout/page-container';

export function ProfileContentSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <div className="space-y-6 order-1">
          <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="space-y-4 px-6 py-6 md:px-8 md:py-8 border-b border-border/40">
              <div className="h-7 w-56 bg-muted/20 animate-pulse rounded-lg" />
              <div className="h-3.5 w-full bg-muted/10 animate-pulse rounded-md" />
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-6 md:px-8 md:py-8">
              <div className="space-y-2.5">
                <div className="h-3 w-12 bg-muted/20 animate-pulse rounded ml-0.5" />
                <div className="h-10 w-full bg-muted/5 animate-pulse rounded-xl border border-border/20" />
                <div className="h-2 w-32 bg-muted/5 animate-pulse rounded ml-0.5" />
              </div>
              <div className="space-y-2.5">
                <div className="h-3 w-32 bg-muted/20 animate-pulse rounded ml-0.5" />
                <div className="h-24 w-full bg-muted/5 animate-pulse rounded-xl border border-border/20" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2.5">
                    <div className="h-3 w-20 bg-muted/20 animate-pulse rounded ml-0.5" />
                    <div className="h-10 w-full bg-muted/5 animate-pulse rounded-xl border border-border/20" />
                  </div>
                ))}
              </div>
              <div className="h-11 w-full bg-violet-600/20 animate-pulse rounded-xl mt-4" />
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="space-y-4 px-6 py-6 md:px-8 md:py-8 border-b border-border/40">
              <div className="h-7 w-32 bg-muted/20 animate-pulse rounded-lg" />
              <div className="h-3.5 w-64 bg-muted/10 animate-pulse rounded-md" />
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-6 md:px-8 md:py-8">
              <div className="space-y-2.5">
                <div className="h-3 w-32 bg-muted/20 animate-pulse rounded ml-0.5" />
                <div className="h-10 w-full bg-muted/5 animate-pulse rounded-xl border border-border/20" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <div className="h-3 w-32 bg-muted/20 animate-pulse rounded ml-0.5" />
                  <div className="h-10 w-full bg-muted/5 animate-pulse rounded-xl border border-border/20" />
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 w-32 bg-muted/20 animate-pulse rounded ml-0.5" />
                  <div className="h-10 w-full bg-muted/5 animate-pulse rounded-xl border border-border/20" />
                </div>
              </div>
              <div className="h-11 w-full bg-violet-600/20 animate-pulse rounded-xl mt-4" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8 order-2">
          <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="space-y-3 px-6 py-6 border-b border-border/40 pb-4">
              <div className="h-7 w-56 bg-muted/20 animate-pulse rounded-lg" />
              <div className="h-3.5 w-64 bg-muted/10 animate-pulse rounded-md" />
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="rounded-xl border border-border/40 overflow-hidden bg-muted/5">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent border-border/40">
                      <TableHead className="py-3 px-4"><div className="h-3 w-12 bg-muted/20 animate-pulse rounded" /></TableHead>
                      <TableHead className="py-3 px-4 text-center"><div className="h-3 w-10 bg-muted/20 animate-pulse rounded mx-auto" /></TableHead>
                      <TableHead className="py-3 px-4 text-center"><div className="h-3 w-8 bg-muted/20 animate-pulse rounded mx-auto" /></TableHead>
                      <TableHead className="py-3 px-4 text-center hidden sm:table-cell"><div className="h-3 w-16 bg-muted/20 animate-pulse rounded mx-auto" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(6)].map((_, i) => (
                      <TableRow key={i} className="border-border/40 last:border-0 hover:bg-transparent">
                        <TableCell className="py-4 px-4"><div className="h-4 w-24 bg-muted/10 animate-pulse rounded-md" /></TableCell>
                        <TableCell className="py-4 px-4 text-center"><div className="h-4 w-12 bg-muted/10 animate-pulse rounded-md mx-auto" /></TableCell>
                        <TableCell className="py-4 px-4 text-center"><div className="h-4 w-12 bg-muted/10 animate-pulse rounded-md mx-auto" /></TableCell>
                        <TableCell className="py-4 px-4 hidden sm:table-cell text-center"><div className="h-4 w-20 bg-muted/10 animate-pulse rounded-md mx-auto" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
            <CardHeader className="space-y-4 px-6 py-6 md:px-8 md:py-8 border-b border-border/40">
              <div className="h-7 w-48 bg-muted/20 animate-pulse rounded-lg" />
              <div className="h-3.5 w-64 bg-muted/10 animate-pulse rounded-md" />
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-6 md:px-8 md:py-8">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-orange-600/5 border border-orange-600/10">
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-16 bg-orange-600/20 animate-pulse rounded" />
                  <div className="h-3 w-32 bg-orange-600/10 animate-pulse rounded" />
                </div>
                <div className="h-4 w-24 bg-orange-600/20 animate-pulse rounded-full" />
              </div>
              <div className="h-11 w-full bg-red-500/10 animate-pulse rounded-xl" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <PageContainer>
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-muted/10 backdrop-blur-md rounded-2xl w-fit border border-border/40">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 w-24 sm:w-32 bg-muted/10 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-10 w-40 bg-red-500/10 animate-pulse rounded-xl border border-red-500/10 hidden md:block" />
      </div>
      <ProfileContentSkeleton />
    </PageContainer>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-10">
      <div className="flex px-1">
        <div className="h-12 w-80 bg-muted/10 animate-pulse rounded-2xl border border-border/40 backdrop-blur-xl shadow-xl" />
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col p-8 rounded-[2rem] border border-border/40 bg-card/20 backdrop-blur-sm shadow-xl relative overflow-hidden">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-muted/20 rounded-r-full" />
            <div className="space-y-6">
              <div className="h-3 w-24 bg-muted/10 animate-pulse rounded" />
              <div className="flex items-baseline gap-2">
                <div className="h-10 md:h-12 w-20 bg-muted/20 animate-pulse rounded-lg" />
                <div className="h-4 w-12 bg-muted/5 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="rounded-[2rem] border border-border/40 bg-card/20 backdrop-blur-sm shadow-xl overflow-hidden">
        <CardHeader className="p-8 border-b border-border/40">
          <div className="h-6 w-56 bg-muted/20 animate-pulse rounded-lg" />
        </CardHeader>
        <CardContent className="p-8">
          <div className="h-[350px] md:h-[450px] w-full bg-muted/5 animate-pulse rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <CardHeader className="px-6 py-6 md:px-8 md:py-8 border-b border-border/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-7 w-56 bg-muted/20 animate-pulse rounded-lg" />
              <div className="h-4 w-48 bg-muted/10 animate-pulse rounded-md" />
            </div>
            <div className="h-10 w-44 bg-muted/20 animate-pulse rounded-xl border border-border/40" />
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="h-[250px] md:h-[280px] w-full bg-muted/5 animate-pulse rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}
