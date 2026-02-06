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
      <div className="px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border/10">
        <div className="h-10 w-full md:w-[320px] bg-muted/10 animate-pulse rounded-xl" />
        <div className="flex items-center gap-2 ml-auto">
          <div className="h-7 w-20 bg-muted/5 animate-pulse rounded-full" />
          <div className="h-7 w-32 bg-muted/10 animate-pulse rounded-full" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 md:px-8 py-2">
        <div className="min-w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-transparent border-b border-border/10">
              <TableRow className="hover:bg-transparent border-none h-14">
                <TableHead className="w-[40px] md:w-[50px] px-4">
                  <div className="h-4 w-4 bg-muted/20 animate-pulse rounded" />
                </TableHead>
                <TableHead className="px-4 text-center">
                  <div className="h-3 w-8 bg-muted/20 animate-pulse rounded-full mx-auto" />
                </TableHead>
                <TableHead className="px-4">
                  <div className="h-3 w-20 bg-muted/20 animate-pulse rounded-full" />
                </TableHead>
                <TableHead className="px-4 text-center hidden sm:table-cell">
                  <div className="h-3 w-12 bg-muted/20 animate-pulse rounded-full mx-auto" />
                </TableHead>
                <TableHead className="px-4 text-center">
                  <div className="h-3 w-10 bg-muted/20 animate-pulse rounded-full mx-auto" />
                </TableHead>
                <TableHead className="px-4 text-center hidden md:table-cell">
                  <div className="h-3 w-12 bg-muted/20 animate-pulse rounded-full mx-auto" />
                </TableHead>
                <TableHead className="px-4 text-center hidden lg:table-cell">
                  <div className="h-3 w-8 bg-muted/20 animate-pulse rounded-full mx-auto" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(rows)].map((_, i) => (
                <TableRow key={i} className="border-border/5 hover:bg-transparent h-16">
                  <TableCell className="px-4">
                    <div className="h-4 w-4 bg-muted/10 animate-pulse rounded mx-auto" />
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="h-3 w-16 bg-muted/20 animate-pulse rounded-full mx-auto" />
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="space-y-2">
                      <div className="h-4 w-[60%] bg-muted/20 animate-pulse rounded-full" />
                      <div className="h-3 w-[30%] bg-muted/10 animate-pulse rounded-full" />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 hidden sm:table-cell text-center">
                    <div className="h-4 w-12 bg-muted/20 animate-pulse rounded-full mx-auto" />
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <div className="h-4 w-10 bg-muted/20 animate-pulse rounded-full mx-auto" />
                  </TableCell>
                  <TableCell className="px-4 hidden md:table-cell text-center">
                    <div className="h-4 w-12 bg-muted/20 animate-pulse rounded-full mx-auto" />
                  </TableCell>
                  <TableCell className="px-4 hidden lg:table-cell text-center">
                    <div className="h-4 w-8 bg-muted/20 animate-pulse rounded-full mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="border-t border-border/10 px-4 md:px-8 py-6 flex items-center justify-between bg-muted/5 backdrop-blur-sm">
        <div className="h-10 w-24 bg-muted/10 animate-pulse rounded-xl" />
        <div className="h-12 w-40 bg-violet-500/10 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
