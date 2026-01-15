import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createConversation, sendMessage } from '@/lib/services/api-client';
import type { Message } from '../components/chat-view';

interface UseConversationCreationProps {
  conversationId: string | null;
}

export function useConversationCreation({ conversationId }: UseConversationCreationProps) {
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [prevId, setPrevId] = useState(conversationId);
  if (conversationId !== prevId) {
    setPrevId(conversationId);
    if (optimisticMessages.length > 0) {
      setOptimisticMessages([]);
    }
    if (isWaitingForResponse) {
      setIsWaitingForResponse(false);
    }
  }

  const createConversationWithMessage = async (userMessage: string) => {
    const optimisticUserMessage: Message = {
      id: 'temp-user',
      role: 'user',
      content: userMessage,
      recommendations: null,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages([optimisticUserMessage]);
    setIsWaitingForResponse(true);

    try {
      const title = userMessage.length > 50
        ? userMessage.substring(0, 50) + '...'
        : userMessage;

      const newConversation = await createConversation(title);
      const newConversationId = newConversation.id;

      const messageData = await sendMessage(newConversationId, userMessage);

      queryClient.setQueryData(['conversation', newConversationId], {
        id: newConversationId,
        title,
        chat_messages: [messageData.userMessage, messageData.assistantMessage],
      });

      router.replace(`/chat/${newConversationId}`, { scroll: false });

      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (error) {
      setOptimisticMessages([]);
      setIsWaitingForResponse(false);
      throw error;
    }
  };

  return {
    optimisticMessages,
    isWaitingForResponse,
    createConversationWithMessage,
  };
}
