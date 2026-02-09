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
        <CardHeader className="flex flex-col gap-4 px-3 py-4 md:px-8 md:py-8 border-b border-border/40">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <div className="h-7 w-24 md:h-10 md:w-44 bg-muted/20 animate-pulse rounded-lg shrink-0" />
                
                {/* Unified Indicator Placeholder */}
                <div className="h-7 w-[100px] md:w-[180px] bg-muted/10 border border-border/20 animate-pulse rounded-full" />
              </div>

              <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                {/* Action Button Placeholder (New Session) */}
                <div className="h-9 w-9 md:h-12 md:w-48 bg-violet-600/20 animate-pulse rounded-xl border border-violet-600/10 shadow-lg shadow-violet-500/5" />
              </div>
            </div>

            {/* Filter row */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
              <div className="h-10 w-full xl:w-[320px] bg-muted/5 animate-pulse rounded-xl border border-border/40" />
              <div className="flex flex-wrap items-center gap-2">
                {/* Type Filter */}
                <div className="h-9 w-24 md:w-32 bg-muted/5 animate-pulse rounded-xl border border-border/40" />
                {/* Period Filter */}
                <div className="h-9 w-48 md:w-64 bg-muted/5 animate-pulse rounded-xl border border-border/40" />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-auto min-w-[800px] md:min-w-0">
              <TableHeader className="bg-transparent border-b border-border/40">
                <TableRow className="hover:bg-transparent border-none h-14">
                  <TableHead className="w-12 px-6"><div className="h-4 w-4 bg-muted/20 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead className="hidden sm:table-cell py-6"><div className="h-3 w-4 bg-muted/10 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead className="hidden lg:table-cell"><div className="h-3 w-4 bg-muted/10 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead><div className="h-3 w-20 bg-muted/10 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead><div className="h-3 w-24 bg-muted/15 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead><div className="h-3 w-12 bg-muted/10 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead><div className="h-3 w-12 bg-muted/10 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead><div className="h-3 w-12 bg-muted/10 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead><div className="h-3 w-12 bg-muted/10 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead><div className="h-3 w-8 bg-muted/10 animate-pulse rounded mx-auto" /></TableHead>
                  <TableHead className="hidden xl:table-cell min-w-[320px] px-8"><div className="h-3 w-32 bg-muted/10 animate-pulse rounded" /></TableHead>
                  <TableHead className="px-6"><div className="h-4 w-1 bg-muted/10 animate-pulse rounded-full mx-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(8)].map((_, i) => (
                  <TableRow key={i} className="border-border/5 hover:bg-transparent h-16">
                    <TableCell className="px-6 py-4">
                      <div className="h-5 w-5 bg-muted/20 animate-pulse rounded-lg mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-4">
                      <div className="h-3 w-4 bg-muted/10 animate-pulse rounded-full mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-4">
                      <div className="h-3 w-4 bg-muted/5 animate-pulse rounded-full mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="h-4 w-20 bg-muted/10 animate-pulse rounded-full mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1.5 items-center">
                        <div className="h-4 w-24 bg-muted/20 animate-pulse rounded-full" style={{ animationDelay: `${i * 100}ms` }} />
                        <div className="h-2.5 w-12 bg-muted/10 animate-pulse rounded-full" style={{ animationDelay: `${i * 100}ms` }} />
                      </div>
                    </TableCell>
                    {[...Array(4)].map((_, mIdx) => (
                      <TableCell key={mIdx} className="py-4">
                        <div className="flex flex-col gap-1.5 items-center">
                          <div className="h-4 w-10 bg-muted/15 animate-pulse rounded-full" style={{ animationDelay: `${i * 100 + mIdx * 50}ms` }} />
                          <div className="h-2 w-6 bg-muted/5 animate-pulse rounded-full" style={{ animationDelay: `${i * 100 + mIdx * 50}ms` }} />
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="py-4">
                      <div className="h-6 w-6 bg-muted/20 animate-pulse rounded-full mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
                    </TableCell>
                    <TableCell className="hidden xl:table-cell min-w-[320px] px-8 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="h-3 w-[100%] bg-muted/10 animate-pulse rounded-full" style={{ animationDelay: `${i * 100}ms` }} />
                        <div className="h-3 w-[70%] bg-muted/5 animate-pulse rounded-full" style={{ animationDelay: `${i * 100}ms` }} />
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="h-8 w-8 bg-muted/10 animate-pulse rounded-xl mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
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
