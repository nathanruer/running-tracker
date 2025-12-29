import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { Message } from '../components/chat-view';

interface UseConversationCreationProps {
  conversationId: string | null;
}

export function useConversationCreation({ conversationId }: UseConversationCreationProps) {
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (conversationId && optimisticMessages.length > 0) {
      setOptimisticMessages([]);
      setIsWaitingForResponse(false);
    }
  }, [conversationId, optimisticMessages.length]);

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

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error('Erreur lors de la création de la conversation');

      const newConversation = await response.json();
      const newConversationId = newConversation.id;

      const messageResponse = await fetch(`/api/conversations/${newConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage }),
      });

      if (!messageResponse.ok) throw new Error('Erreur lors de l\'envoi du message');

      const messageData = await messageResponse.json();

      queryClient.setQueryData(['conversation', newConversationId], {
        id: newConversationId,
        title,
        chat_messages: [messageData.userMessage, messageData.assistantMessage],
      });

      router.replace(`/chat/${newConversationId}`, { scroll: false });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['conversation', newConversationId] });
      }, 500);
    } catch (error) {
      console.error('Error creating conversation:', error);
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
