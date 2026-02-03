'use client';

import { SquarePen, MessageSquare } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { getConversation } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useConversationMutations } from '../hooks/use-conversation-mutations';
import { useConversations } from '../hooks/use-conversations';
import { ConversationListItem } from './conversation-list-item';

interface ChatSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isMobile?: boolean;
  disableCreate?: boolean;
}

export function ChatSidebar({ selectedConversationId, onSelectConversation, isMobile = false, disableCreate = false }: ChatSidebarProps) {
  const queryClient = useQueryClient();

  const { conversations, isLoading } = useConversations();

  const {
    renameDialogOpen,
    setRenameDialogOpen,
    newTitle,
    setNewTitle,
    handleRenameClick,
    handleRenameSubmit,
    handleRenameCancel,
    isRenaming,
    
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleDeleteClick,
    handleDeleteSubmit,
    handleDeleteCancel,
    isDeleting,
  } = useConversationMutations({
    onConversationCreated: onSelectConversation,
    onConversationDeleted: (deletedId) => {
      if (selectedConversationId === deletedId) {
        onSelectConversation('');
      }
    },
  });

  const handlePrefetch = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.conversation(id),
      queryFn: () => getConversation(id),
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <>
      <div className={cn(
        isMobile ? 'w-full bg-background' : 'w-80 shrink-0 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm',
        "h-full flex flex-col shadow-none overflow-hidden"
      )}>
        <div className={cn(
          "flex items-center px-4 py-6 md:px-6 shrink-0",
          isMobile && "pr-14"
        )}>
          <h2 className="text-xl font-bold tracking-tight">Conversations</h2>
        </div>

        <div className="px-4 mb-4">
          <Button
            data-testid="btn-new-conversation"
            onClick={() => onSelectConversation('')}
            disabled={disableCreate}
            variant="action"
            className="w-full rounded-2xl h-11 px-4 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 font-bold text-sm"
          >
            <SquarePen className="h-4 w-4" />
            <span>Nouveau chat</span>
          </Button>
        </div>

        <div className="px-4 mb-2">
          <div className="h-px w-full bg-border/40" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 p-4 pt-2">
          {!isLoading && conversations.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-10" />
              <p className="text-sm font-medium">Aucune conversation</p>
              <p className="text-xs mt-1 text-muted-foreground/50">Créez-en une pour commencer</p>
            </div>
          )}

          {conversations.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedConversationId === conv.id}
              isMobile={isMobile}
              onSelect={onSelectConversation}
              onRename={handleRenameClick}
              onDelete={handleDeleteClick}
              onPrefetch={handlePrefetch}
            />
          ))}
        </div>
      </div>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la conversation</DialogTitle>
            <DialogDescription>
              Donnez un nouveau titre à cette conversation.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nouveau titre"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
            }}
          />
          <DialogFooter className="gap-2 pt-4">
            <Button variant="neutral" size="xl" onClick={handleRenameCancel} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!newTitle.trim() || isRenaming}
              variant="action"
              size="xl"
              className="flex-1"
            >
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer la conversation"
        description="Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible."
        confirmLabel="Confirmer la suppression"
        onConfirm={handleDeleteSubmit}
        onCancel={handleDeleteCancel}
        isLoading={isDeleting}
      />
    </>
  );
}
