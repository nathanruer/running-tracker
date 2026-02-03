import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createConversationWithMessage, type Conversation } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';

interface UseConversationCreationProps {
  onConversationCreated?: (id: string) => void;
}

export function useConversationCreation({ onConversationCreated }: UseConversationCreationProps) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const createAndRedirect = useCallback(async (userMessage: string) => {
    if (isCreating) return;

    setIsCreating(true);

    try {
      const { conversationId } = await createConversationWithMessage(userMessage);

      const title = userMessage.length > 50
        ? userMessage.substring(0, 50) + '...'
        : userMessage;

      queryClient.setQueryData(queryKeys.conversations(), (old: Conversation[] | undefined) => {
        const newConv: Conversation = {
          id: conversationId,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return old ? [newConv, ...old] : [newConv];
      });

      onConversationCreated?.(conversationId);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, queryClient, onConversationCreated]);

  return {
    isCreating,
    createAndRedirect,
  };
}
