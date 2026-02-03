import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  createConversation as apiCreateConversation,
  renameConversation as apiRenameConversation,
  deleteConversation as apiDeleteConversation,
  type Conversation,
} from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';

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
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      onConversationCreated?.(data.id);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversation(variables.id) });
      setRenameDialogOpen(false);
      setSelectedForRename(null);
      setNewTitle('');
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
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.conversations() });
      await queryClient.cancelQueries({ queryKey: queryKeys.conversation(deletedId) });

      const previousConversations = queryClient.getQueryData<Conversation[]>(queryKeys.conversations());

      queryClient.setQueryData<Conversation[]>(queryKeys.conversations(), (old) =>
        old?.filter((c) => c.id !== deletedId) ?? []
      );

      queryClient.removeQueries({ queryKey: queryKeys.conversation(deletedId) });

      setDeleteDialogOpen(false);
      setSelectedForDelete(null);

      onConversationDeleted?.(deletedId);

      return { previousConversations, deletedId };
    },
    onError: (_, __, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(queryKeys.conversations(), context.previousConversations);
      }
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
