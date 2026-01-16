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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
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
    isCreating,
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
      <Card className={`${isMobile ? 'w-full border-0 shadow-none' : 'w-80'} h-full flex flex-col rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-none overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-6 border-b border-border/40 mb-2">
          <h2 className="text-xl font-bold tracking-tight">Conversations</h2>
          <Button
            size="icon"
            onClick={() => createConversation()}
            disabled={isCreating || disableCreate}
            variant="action"
            className="h-9 w-9"
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
              onDelete={handleDeleteClick}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">Supprimer la conversation</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground/80">
              Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              onClick={handleDeleteCancel}
              className={buttonVariants({ variant: 'neutral', size: 'xl' })}
              disabled={isDeleting}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              className={buttonVariants({ variant: 'destructive-premium', size: 'xl' })}
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
