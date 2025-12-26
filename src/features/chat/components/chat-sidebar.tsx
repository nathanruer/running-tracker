'use client';

import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    chat_messages: number;
  };
}

interface ChatSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  isMobile?: boolean;
}

export function ChatSidebar({ selectedConversationId, onSelectConversation, isMobile = false }: ChatSidebarProps) {
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Erreur lors du chargement des conversations');
      return response.json() as Promise<Conversation[]>;
    },
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
        await queryClient.refetchQueries({ queryKey: ['conversations'] });
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
      queryFn: async () => {
        const response = await fetch(`/api/conversations/${id}`);
        if (!response.ok) throw new Error('Erreur lors du chargement de la conversation');
        return response.json();
      },
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <>
      <Card className={`${isMobile ? 'w-full border-0 shadow-none' : 'w-80'} h-full flex flex-col p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button
            size="sm"
            onClick={() => createConversation()}
            disabled={isCreating}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading && conversations.length === 0 && (
            <div className="text-center text-muted-foreground py-4">Chargement...</div>
          )}

          {!isLoading && conversations.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune conversation</p>
              <p className="text-xs mt-1">Créez-en une pour commencer</p>
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
          <DialogFooter>
            <Button variant="outline" onClick={handleRenameCancel}>
              Annuler
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!newTitle.trim() || isRenaming}
            >
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
