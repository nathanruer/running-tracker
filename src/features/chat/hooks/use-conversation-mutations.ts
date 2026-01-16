import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  createConversation as apiCreateConversation,
  renameConversation as apiRenameConversation,
  deleteConversation as apiDeleteConversation,
  type Conversation,
} from '@/lib/services/api-client';

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

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedForRename, setSelectedForRename] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => apiCreateConversation(),
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
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiRenameConversation(id, title),
    onSuccess: (_, variables) => {
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
    mutationFn: (id: string) => apiDeleteConversation(id),
    onSuccess: async (_, deletedId) => {
      onConversationDeleted?.(deletedId);

      await queryClient.cancelQueries({ queryKey: ['conversation', deletedId] });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.removeQueries({ queryKey: ['conversation', deletedId] });

      toast({
        title: 'Conversation supprimée',
        description: 'La conversation a été supprimée.',
      });
      setDeleteDialogOpen(false);
      setSelectedForDelete(null);
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

  const handleDeleteClick = (id: string) => {
    setSelectedForDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubmit = () => {
    if (!selectedForDelete) return;
    deleteMutation.mutate(selectedForDelete);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedForDelete(null);
  };

  return {
    createConversation: createMutation.mutate,
    renameConversation: renameMutation.mutate,
    deleteConversation: deleteMutation.mutate,

    isCreating: createMutation.isPending,
    isRenaming: renameMutation.isPending,
    isDeleting: deleteMutation.isPending,

    renameDialogOpen,
    setRenameDialogOpen,
    selectedForRename,
    newTitle,
    setNewTitle,
    handleRenameClick,
    handleRenameSubmit,
    handleRenameCancel,

    deleteDialogOpen,
    setDeleteDialogOpen,
    handleDeleteClick,
    handleDeleteSubmit,
    handleDeleteCancel,
  };
}
