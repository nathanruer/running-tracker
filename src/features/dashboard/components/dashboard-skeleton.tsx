import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageContainer } from '@/components/layout/page-container';

export function DashboardSkeleton() {
  return (
    <PageContainer>
      {/* Mobile Title */}
      <div className="h-8 w-48 bg-muted/20 animate-pulse rounded-lg mb-6 md:hidden mx-1" />

      <Card 
        data-testid="dashboard-skeleton"
        className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden"
      >
        <CardHeader className="flex flex-col gap-6 px-4 md:px-8 py-6 md:py-8 border-b border-border/40">
          <div className="flex flex-col gap-6">
            {/* Top row: Title and Primary Actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div 
                  data-testid="skeleton-title"
                  className="h-8 w-32 md:h-10 md:w-44 bg-muted/20 animate-pulse rounded-lg" 
                />
                <div className="h-6 w-10 bg-violet-600/20 animate-pulse rounded-full border border-violet-600/10" />
              </div>
              
              <div className="flex items-center gap-2">
                {/* Active Action Button (Violet) */}
                <div 
                  data-testid="skeleton-action"
                  className="h-10 md:h-12 w-32 md:w-48 bg-violet-600/20 animate-pulse rounded-xl md:rounded-2xl border border-violet-600/10" 
                />
                {/* Secondary Action (Export) */}
                <div className="h-10 md:h-12 w-10 md:w-12 bg-muted/10 animate-pulse rounded-xl md:rounded-2xl border border-border/40" />
              </div>
            </div>

            {/* Filter row: Search, Type, and Period */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4">
              {/* Search Bar Skeleton */}
              <div className="w-full xl:w-[320px]">
                <div className="h-10 w-full bg-muted/5 animate-pulse rounded-xl border border-border/40" />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Type Select Skeleton */}
                <div className="h-10 w-[140px] md:w-[160px] bg-muted/5 animate-pulse rounded-xl border border-border/40" />
                
                {/* Period Filter Skeleton (Tabs look) */}
                <div className="flex gap-1 p-1 bg-muted/5 backdrop-blur-md rounded-xl border border-border/40">
                  <div className="h-8 w-16 bg-violet-600/20 animate-pulse rounded-lg" />
                  <div className="h-8 w-20 bg-muted/5 animate-pulse rounded-lg" />
                  <div className="h-8 w-16 bg-muted/5 animate-pulse rounded-lg" />
                  <div className="h-8 w-16 bg-muted/5 animate-pulse rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-auto min-w-[1200px] xl:min-w-0">
              <TableHeader className="bg-transparent border-b border-border/40">
                <TableRow className="hover:bg-transparent border-none">
                  {/* Matching sessions-table columns precisely */}
                  <TableHead className="w-12 px-6">
                    <div className="h-4 w-4 bg-muted/20 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="w-12 text-center py-6">
                    <div className="h-3 w-4 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="w-16 text-center">
                    <div className="h-3 w-8 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="w-32 text-center">
                    <div className="h-3 w-20 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="w-40">
                    <div className="h-3 w-16 bg-muted/10 animate-pulse rounded" />
                  </TableHead>
                  <TableHead className="w-24 text-center">
                    <div className="h-3 w-12 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="w-20 text-center">
                    <div className="h-3 w-8 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="w-24 text-center">
                    <div className="h-3 w-12 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="w-20 text-center">
                    <div className="h-3 w-6 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="w-16 text-center">
                    <div className="h-3 w-6 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableHead>
                  <TableHead className="min-w-[300px]">
                    <div className="h-3 w-32 bg-muted/10 animate-pulse rounded" />
                  </TableHead>
                  <TableHead className="w-12 px-6">
                    <div className="h-4 w-1 bg-muted/10 animate-pulse rounded-full mx-auto" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(10)].map((_, i) => (
                  <TableRow key={i} className="border-border/10 hover:bg-transparent">
                    <TableCell className="px-6 py-5">
                      <div className="h-4 w-4 bg-muted/10 animate-pulse rounded mx-auto" />
                    </TableCell>
                    {/* # */}
                    <TableCell className="text-center py-5">
                      <div className="h-4 w-4 bg-muted/10 animate-pulse rounded mx-auto" />
                    </TableCell>
                    {/* SEM. */}
                    <TableCell className="text-center">
                      <div className="h-4 w-4 bg-muted/5 animate-pulse rounded mx-auto" />
                    </TableCell>
                    {/* DATE */}
                    <TableCell className="text-center">
                      <div className="h-4 w-20 bg-muted/5 animate-pulse rounded mx-auto" />
                    </TableCell>
                    {/* SÉANCE */}
                    <TableCell>
                      <div className="h-4 w-24 bg-muted/20 animate-pulse rounded-md" />
                    </TableCell>
                    {/* DURÉE */}
                    <TableCell className="text-center">
                      <div className="h-4 w-12 bg-muted/10 animate-pulse rounded-md mx-auto" />
                    </TableCell>
                    {/* DIST. */}
                    <TableCell className="text-center">
                      <div className="h-4 w-14 bg-muted/10 animate-pulse rounded-md mx-auto" />
                    </TableCell>
                    {/* ALLURE */}
                    <TableCell className="text-center">
                      <div className="h-4 w-16 bg-muted/10 animate-pulse rounded-md mx-auto" />
                    </TableCell>
                    {/* FC */}
                    <TableCell className="text-center">
                      <div className="h-4 w-14 bg-muted/10 animate-pulse rounded-md mx-auto" />
                    </TableCell>
                    {/* RPE */}
                    <TableCell className="text-center">
                       <div className="h-4 w-10 bg-muted/20 animate-pulse rounded-md mx-auto" />
                    </TableCell>
                    {/* COMMENTAIRES */}
                    <TableCell className="max-w-[400px]">
                      <div className="h-3.5 w-[90%] bg-muted/5 animate-pulse rounded-md" />
                    </TableCell>
                    {/* ACTIONS */}
                    <TableCell className="px-6">
                      <div className="h-4 w-1 bg-muted/5 animate-pulse rounded-full mx-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
