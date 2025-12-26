import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    chat_messages: number;
  };
}

interface UseConversationMutationsProps {
  onConversationCreated?: (id: string) => void;
  onConversationDeleted?: (deletedId: string) => void;
}

export function useConversationMutations({
  onConversationCreated,
  onConversationDeleted
}: UseConversationMutationsProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog state for renaming
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedForRename, setSelectedForRename] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');

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
      onConversationCreated?.(data.id);
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

      onConversationDeleted?.(deletedId);

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

  const handleRenameCancel = () => {
    setRenameDialogOpen(false);
    setSelectedForRename(null);
    setNewTitle('');
  };

  return {
    // Mutations
    createConversation: createMutation.mutate,
    renameConversation: renameMutation.mutate,
    deleteConversation: deleteMutation.mutate,

    // Loading states
    isCreating: createMutation.isPending,
    isRenaming: renameMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Rename dialog state
    renameDialogOpen,
    setRenameDialogOpen,
    selectedForRename,
    newTitle,
    setNewTitle,
    handleRenameClick,
    handleRenameSubmit,
    handleRenameCancel,
  };
}
