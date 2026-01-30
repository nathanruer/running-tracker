'use client';

import { TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTruncationDetection } from '../../hooks/use-truncation-detection';

interface CommentCellProps {
  comment: string;
  className?: string;
  onShowMore?: () => void;
  isPlanned?: boolean;
}

export function CommentCell({ comment, className = '', onShowMore, isPlanned = false }: CommentCellProps) {
  const { isTruncated, elementRef } = useTruncationDetection(comment);

  if (!comment || comment.trim() === '') {
    return (
      <TableCell className={cn("py-4 text-center opacity-20", className)}>
        <span className="text-muted-foreground/10 text-xs">—</span>
      </TableCell>
    );
  }

  const isInteractive = isTruncated && onShowMore;

  return (
    <TableCell 
      className={cn(
        "py-4 min-w-[220px] max-w-[340px] px-6 transition-all",
        className
      )}
    >
      <div 
        ref={elementRef}
        onClick={(e) => {
          if (isInteractive) {
            e.stopPropagation();
            onShowMore();
          }
        }}
        className={cn(
          "relative text-[13px] leading-relaxed break-words line-clamp-2 transition-all duration-500",
          isPlanned 
            ? "text-muted-foreground/30" 
            : "text-muted-foreground/50",
          isInteractive && (isPlanned 
            ? "group-hover/row:text-muted-foreground/60 cursor-pointer" 
            : "group-hover/row:text-muted-foreground/90 cursor-pointer")
        )}
      >
        {comment}
      </div>
    </TableCell>
  );
}
