import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StravaLoadingSkeletonProps } from './types';

export function StravaLoadingSkeleton({ rows = 6 }: StravaLoadingSkeletonProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background">
      {/* Toolbar Skeleton */}
      <div className="px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-border/10">
        <div className="h-9 w-full md:w-[320px] bg-muted/10 animate-pulse rounded-xl" />
        <div className="h-8 w-24 bg-muted/10 animate-pulse rounded-xl ml-auto" />
      </div>

      <div className="flex-1 overflow-hidden px-4 md:px-8 py-2">
        <div className="min-w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-transparent border-b border-border/40">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[40px] md:w-[50px] py-4 px-2 md:px-4">
                  <div className="h-4 w-4 bg-muted/10 animate-pulse rounded mx-auto" />
                </TableHead>
                <TableHead className="py-4 px-2 md:px-4 text-center">
                  <div className="h-3 w-8 bg-muted/10 animate-pulse rounded mx-auto" />
                </TableHead>
                <TableHead className="py-4 px-2 md:px-4">
                  <div className="h-3 w-20 bg-muted/10 animate-pulse rounded" />
                </TableHead>
                <TableHead className="py-4 px-2 md:px-4 text-center hidden sm:table-cell">
                  <div className="h-3 w-12 bg-muted/10 animate-pulse rounded mx-auto" />
                </TableHead>
                <TableHead className="py-4 px-2 md:px-4 text-center">
                  <div className="h-3 w-10 bg-muted/10 animate-pulse rounded mx-auto" />
                </TableHead>
                <TableHead className="py-4 px-2 md:px-4 text-center hidden md:table-cell">
                  <div className="h-3 w-12 bg-muted/10 animate-pulse rounded mx-auto" />
                </TableHead>
                <TableHead className="py-4 px-2 md:px-4 text-center hidden lg:table-cell">
                  <div className="h-3 w-8 bg-muted/10 animate-pulse rounded mx-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(rows)].map((_, i) => (
                <TableRow key={i} className="border-border/10 hover:bg-transparent">
                  <TableCell className="py-3 md:py-4 px-2 md:px-4">
                    <div className="h-4 w-4 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-2 md:px-4">
                    <div className="h-3 w-16 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-2 md:px-4">
                    <div className="space-y-2">
                      <div className="h-4 w-[60%] bg-muted/10 animate-pulse rounded" />
                      <div className="h-3 w-[30%] bg-muted/5 animate-pulse rounded" />
                    </div>
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-2 md:px-4 hidden sm:table-cell">
                    <div className="h-4 w-12 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-2 md:px-4">
                    <div className="h-4 w-10 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-2 md:px-4 hidden md:table-cell">
                    <div className="h-4 w-12 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-2 md:px-4 hidden lg:table-cell">
                    <div className="h-4 w-8 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="border-t border-border/10 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between bg-card/30">
        <div className="h-10 w-24 bg-muted/10 animate-pulse rounded-xl" />
        <div className="h-10 md:h-12 w-32 md:w-40 bg-muted/10 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}

export function StravaLoadingMoreSkeleton() {
  return (
    <div className="w-full space-y-4 px-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 opacity-40">
          <div className="h-8 w-8 md:h-10 md:w-10 bg-muted/10 animate-pulse rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-muted/10 animate-pulse rounded-lg" />
            <div className="h-3 w-1/4 bg-muted/5 animate-pulse rounded-md" />
          </div>
          <div className="h-8 w-16 bg-muted/5 animate-pulse rounded-lg" />
        </div>
      ))}
    </div>
  );
}
