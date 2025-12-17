'use client';

import { useState } from 'react';
import { Plus, MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
}

export function ChatSidebar({ selectedConversationId, onSelectConversation }: ChatSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedForRename, setSelectedForRename] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Erreur lors du chargement des conversations');
      return response.json() as Promise<Conversation[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nouvelle conversation' }),
      });
      if (!response.ok) throw new Error('Erreur lors de la création');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onSelectConversation(data.id);
      toast({
        title: 'Conversation créée',
        description: 'Une nouvelle conversation a été créée.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la conversation.',
        variant: 'destructive',
      });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error('Erreur lors du renommage');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
      setRenameDialogOpen(false);
      setSelectedForRename(null);
      setNewTitle('');
      toast({
        title: 'Conversation renommée',
        description: 'Le titre de la conversation a été modifié.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de renommer la conversation.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      return response.json();
    },
    onSuccess: async (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', deletedId] });

      if (selectedConversationId === deletedId) {
        await queryClient.refetchQueries({ queryKey: ['conversations'] });
        const updatedConversations = queryClient.getQueryData(['conversations']) as Conversation[] | undefined;

        if (updatedConversations && updatedConversations.length > 0) {
          onSelectConversation(updatedConversations[0].id);
        } else {
          onSelectConversation('');
        }
      }

      toast({
        title: 'Conversation supprimée',
        description: 'La conversation a été supprimée.',
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la conversation.',
        variant: 'destructive',
      });
    },
  });

  const handleRenameClick = (conversation: Conversation) => {
    setSelectedForRename(conversation);
    setNewTitle(conversation.title);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (!selectedForRename || !newTitle.trim()) return;
    renameMutation.mutate({ id: selectedForRename.id, title: newTitle.trim() });
  };

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
      <Card className="w-80 h-full flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
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
            <div
              key={conv.id}
              className={`
                group flex items-center gap-2 p-3 rounded-lg cursor-pointer
                transition-colors hover:bg-muted
                ${selectedConversationId === conv.id ? 'bg-muted' : ''}
              `}
              onClick={() => onSelectConversation(conv.id)}
              onMouseEnter={() => handlePrefetch(conv.id)}
              onFocus={() => handlePrefetch(conv.id)}
              tabIndex={0}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conv.title}</p>
                <p className="text-xs text-muted-foreground">
                  {conv._count.chat_messages} message(s)
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleRenameClick(conv);
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Renommer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(conv.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={!newTitle.trim() || renameMutation.isPending}
            >
              Renommer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
