'use client';

import { TableCell } from '@/components/ui/table';
import { useTruncationDetection } from '../hooks/use-truncation-detection';

interface CommentCellProps {
  comment: string;
  className?: string;
  onShowMore?: () => void;
}

export function CommentCell({ comment, className = '', onShowMore }: CommentCellProps) {
  const { isTruncated, elementRef } = useTruncationDetection(comment);

  if (!comment || comment.trim() === '') {
    return (
      <TableCell className={className}>
        <p className="text-sm text-muted-foreground/50">-</p>
      </TableCell>
    );
  }

  if (isTruncated && onShowMore) {
    return (
      <TableCell className={className}>
        <button
          className="text-left w-full hover:bg-muted/40 rounded-md px-2 py-1.5 -mx-2 -my-1.5 transition-colors cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            onShowMore();
          }}
        >
          <div
            ref={elementRef}
            className="text-sm text-muted-foreground line-clamp-3 break-words"
          >
            {comment}
          </div>
          <div className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors mt-1">
            Afficher plus
          </div>
        </button>
      </TableCell>
    );
  }

  return (
    <TableCell className={className}>
      <div
        ref={elementRef}
        className="text-sm text-muted-foreground line-clamp-3 break-words"
      >
        {comment}
      </div>
    </TableCell>
  );
}
