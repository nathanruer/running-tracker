import { MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    chat_messages: number;
  };
}

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
      className={`
        group flex items-center gap-2 p-3 rounded-lg cursor-pointer
        transition-colors hover:bg-muted
        ${isSelected ? 'bg-muted' : ''}
      `}
      onClick={() => onSelect(conversation.id)}
      onMouseEnter={() => onPrefetch(conversation.id)}
      onFocus={() => onPrefetch(conversation.id)}
      tabIndex={0}
    >
      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conversation.title}</p>
        <p className="text-xs text-muted-foreground">
          {conversation._count.chat_messages} message(s)
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className={isMobile ? '' : 'opacity-0 group-hover:opacity-100'}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRename(conversation);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conversation.id);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
