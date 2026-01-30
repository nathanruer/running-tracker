import { MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Conversation } from '@/lib/services/api-client';

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isMobile?: boolean;
  onSelect: (id: string) => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (id: string) => void;
  onPrefetch: (id: string) => void;
}

export function ConversationListItem({
  conversation,
  isSelected,
  isMobile = false,
  onSelect,
  onRename,
  onDelete,
  onPrefetch,
}: ConversationListItemProps) {
  return (
    <div
      data-testid={`conversation-${conversation.id}`}
      className={`
        group flex items-center gap-3 p-3.5 rounded-xl cursor-pointer
        transition-all active:scale-[0.98]
        ${isSelected ? 'bg-muted/60' : 'hover:bg-muted/30'}
      `}
      onClick={() => onSelect(conversation.id)}
      onMouseEnter={() => onPrefetch(conversation.id)}
      onFocus={() => onPrefetch(conversation.id)}
      tabIndex={0}
    >
      <MessageSquare className={cn(
        "h-4 w-4 flex-shrink-0 transition-colors",
        isSelected ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm truncate transition-colors",
          isSelected ? "font-bold text-foreground" : "font-medium text-muted-foreground/70 group-hover:text-foreground"
        )}>{conversation.title}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className={`
              h-8 w-8 hover:bg-muted/80 transition-all
              ${isMobile ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}
            `}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Conversation</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRename(conversation);
            }}
          >
            <Pencil className="h-4 w-4" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conversation.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
