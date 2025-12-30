'use client';

import { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTruncationDetection } from '../hooks/use-truncation-detection';

interface CommentCellProps {
  comment: string;
  className?: string;
}

export function CommentCell({ comment, className = '' }: CommentCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isTruncated, elementRef } = useTruncationDetection(comment);

  if (!comment || comment.trim() === '') {
    return (
      <TableCell className={className}>
        <p className="text-sm text-muted-foreground/50">-</p>
      </TableCell>
    );
  }

  if (isTruncated) {
    return (
      <TableCell className={className}>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              className="text-left w-full hover:bg-muted/40 rounded-md px-2 py-1.5 -mx-2 -my-1.5 transition-colors cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
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
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Commentaire</SheetTitle>
              <SheetDescription className="sr-only">
                Affichage du commentaire complet de la séance
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {comment}
              </p>
            </div>
          </SheetContent>
        </Sheet>
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
