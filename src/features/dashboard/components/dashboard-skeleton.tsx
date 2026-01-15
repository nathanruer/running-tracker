'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function DashboardSkeleton() {
  return (
    <div className="w-full py-4 md:py-8 px-3 md:px-6 xl:px-12">
      <div className="mx-auto max-w-[90rem]">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg mb-8 md:hidden mx-1" />

        <Card className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
          <CardHeader className="flex flex-col gap-6 px-8 py-8 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="h-7 w-56 bg-muted animate-pulse rounded-lg" />
              <div className="h-11 w-40 bg-muted animate-pulse rounded-xl hidden md:block" />
              <div className="h-11 w-11 bg-muted animate-pulse rounded-xl md:hidden" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="h-10 w-full sm:w-[200px] bg-muted/30 animate-pulse rounded-xl" />
              <div className="h-10 w-full sm:w-[180px] bg-muted/30 animate-pulse rounded-xl" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="table-auto">
                <TableHeader className="bg-muted/5 font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="w-12 px-6">
                      <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                    </TableHead>
                    {[...Array(10)].map((_, i) => (
                      <TableHead key={i} className="py-6 whitespace-nowrap text-center">
                        <div className="h-3 w-12 bg-muted/40 animate-pulse rounded mx-auto" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(8)].map((_, i) => (
                    <TableRow key={i} className="border-border/20">
                      <TableCell className="px-6 py-4">
                        <div className="h-4 w-4 bg-muted/30 animate-pulse rounded mx-auto" />
                      </TableCell>
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={j} className="py-4 text-center">
                          <div className="h-5 w-16 bg-muted/20 animate-pulse rounded-lg mx-auto" />
                        </TableCell>
                      ))}
                      <TableCell className="min-w-[320px] px-8 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="h-3 w-[90%] bg-muted/30 animate-pulse rounded-full" />
                          <div className="h-3 w-[75%] bg-muted/20 animate-pulse rounded-full" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="h-10 w-10 bg-muted/30 animate-pulse rounded-xl mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
