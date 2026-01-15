'use client';

import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConversations, getConversation, type Conversation } from '@/lib/services/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConversationMutations } from '../hooks/use-conversation-mutations';
import { ConversationListItem } from './conversation-list-item';

interface ChatSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isMobile?: boolean;
  disableCreate?: boolean;
}

export function ChatSidebar({ selectedConversationId, onSelectConversation, isMobile = false, disableCreate = false }: ChatSidebarProps) {
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });

  const {
    createConversation,
    deleteConversation,
    isCreating,
    renameDialogOpen,
    setRenameDialogOpen,
    newTitle,
    setNewTitle,
    handleRenameClick,
    handleRenameSubmit,
    handleRenameCancel,
    isRenaming,
  } = useConversationMutations({
    onConversationCreated: onSelectConversation,
    onConversationDeleted: async (deletedId) => {
      if (selectedConversationId === deletedId) {
        await queryClient.invalidateQueries({ queryKey: ['conversations'] });
        const updatedConversations = queryClient.getQueryData(['conversations']) as Conversation[] | undefined;

        if (updatedConversations && updatedConversations.length > 0) {
          onSelectConversation(updatedConversations[0].id);
        } else {
          onSelectConversation('');
        }
      }
    },
  });

  const handlePrefetch = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['conversation', id],
      queryFn: () => getConversation(id),
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <>
      <Card className={`${isMobile ? 'w-full border-0 shadow-none' : 'w-80'} h-full flex flex-col rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-6 border-b border-border/40 mb-2">
          <h2 className="text-xl font-bold tracking-tight">Conversations</h2>
          <Button
            size="sm"
            onClick={() => createConversation()}
            disabled={isCreating || disableCreate}
            className="h-9 w-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all p-0 shadow-lg shadow-violet-500/10"
          >
            <Plus className="h-4 w-4" />
          </Button>
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
              onDelete={deleteConversation}
              onPrefetch={handlePrefetch}
            />
          ))}
        </div>
      </Card>

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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleRenameCancel} className="font-semibold active:scale-95 transition-all">
              Annuler
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!newTitle.trim() || isRenaming}
              className="h-10 px-6 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all"
            >
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
