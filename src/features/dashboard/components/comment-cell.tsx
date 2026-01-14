'use client';

import { TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTruncationDetection } from '../hooks/use-truncation-detection';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CommentCellProps {
  comment: string;
  className?: string;
  onShowMore?: () => void;
}

export function CommentCell({ comment, className = '', onShowMore }: CommentCellProps) {
  const { isTruncated, elementRef } = useTruncationDetection(comment);

  if (!comment || comment.trim() === '') {
    return (
      <TableCell className={cn("py-4 text-center", className)}>
        <span className="text-muted-foreground/10 text-xs">—</span>
      </TableCell>
    );
  }

  const isInteractive = isTruncated && onShowMore;

  return (
    <TableCell 
      className={cn(
        "py-4 min-w-[200px] max-w-[320px] px-6 transition-colors group/comment",
        isInteractive ? "cursor-pointer hover:bg-muted/10" : "",
        className
      )}
      onClick={(e) => {
        if (isInteractive) {
          e.stopPropagation();
          onShowMore();
          // Small hack to scroll to notes after the sheet opens
          setTimeout(() => {
            const notesElement = document.getElementById('session-notes');
            if (notesElement) {
              notesElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      }}
    >
      {isInteractive ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                ref={elementRef}
                className="text-[13px] leading-relaxed break-words line-clamp-2 transition-colors duration-200 text-muted-foreground/40 group-hover/comment:text-foreground/90"
              >
                {comment}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-popover/95 backdrop-blur-md border-border/50 py-1 px-2.5 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Voir plus</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div 
          ref={elementRef}
          className="text-[13px] leading-relaxed break-words line-clamp-2 transition-colors duration-200 text-muted-foreground/60"
        >
          {comment}
        </div>
      )}
    </TableCell>
  );
}
