'use client';

import { memo } from 'react';
import { TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface CommentCellProps {
  comment: string;
  className?: string;
  isPlanned?: boolean;
}

export const CommentCell = memo(function CommentCell({ comment, className = '', isPlanned = false }: CommentCellProps) {
  if (!comment || comment.trim() === '') {
    return (
      <TableCell className={cn("py-4 text-center opacity-20", className)}>
        <span className="text-muted-foreground/10 text-xs">—</span>
      </TableCell>
    );
  }

  return (
    <TableCell 
      className={cn(
        "py-4 min-w-[220px] max-w-[340px] px-6 transition-all",
        className
      )}
    >
      <div 
        className={cn(
          "relative text-[13px] leading-relaxed break-words line-clamp-2 transition-all duration-500",
          isPlanned 
            ? "text-muted-foreground/30" 
            : "text-muted-foreground/50"
        )}
      >
        {comment}
      </div>
    </TableCell>
  );
});
