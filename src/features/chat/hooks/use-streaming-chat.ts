import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { ConversationWithMessages } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';

interface StreamEvent {
  type: 'chunk' | 'done' | 'json' | 'error';
  data: string;
}

interface SendStreamingMessageOptions {
  skipOptimisticUserMessage?: boolean;
  skipSaveUserMessage?: boolean;
}

interface UseStreamingChatReturn {
  streamingContent: string;
  isStreaming: boolean;
  sendStreamingMessage: (conversationId: string, content: string, options?: SendStreamingMessageOptions) => Promise<void>;
  cancelStream: () => void;
}

export function useStreamingChat(): UseStreamingChatReturn {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendStreamingMessage = useCallback(
    async (conversationId: string, content: string, options?: SendStreamingMessageOptions) => {
      if (!conversationId) return;

      const skipOptimistic = options?.skipOptimisticUserMessage ?? false;
      const skipSaveUserMessage = options?.skipSaveUserMessage ?? false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);
      setStreamingContent('');

      if (!skipOptimistic) {
        queryClient.setQueryData(
          queryKeys.conversation(conversationId),
          (old: ConversationWithMessages | undefined) => {
            if (!old) return old;
            return {
              ...old,
              chat_messages: [
                ...old.chat_messages,
                {
                  id: `temp-user-${crypto.randomUUID()}`,
                  role: 'user',
                  content,
                  createdAt: new Date().toISOString(),
                  recommendations: null,
                },
              ],
            };
          }
        );
      }

      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, skipSaveUserMessage }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la connexion au stream');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Stream non disponible');

        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let jsonResponse: unknown = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

          for (const line of lines) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;

            try {
              const event: StreamEvent = JSON.parse(dataStr);

              if (event.type === 'chunk') {
                accumulatedContent += event.data;
                setStreamingContent(accumulatedContent);
              } else if (event.type === 'json') {
                jsonResponse = JSON.parse(event.data);
              } else if (event.type === 'error') {
                throw new Error(event.data);
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }

        const finalContent = accumulatedContent || 'Reponse recue';
        const recommendations = jsonResponse && typeof jsonResponse === 'object' && 'recommended_sessions' in jsonResponse
          ? jsonResponse
          : null;

        queryClient.setQueryData(
          queryKeys.conversation(conversationId),
          (old: ConversationWithMessages | undefined) => {
            if (!old) return old;

            const messagesWithoutTemp = old.chat_messages.filter(
              (m) => !m.id.toString().startsWith('temp-')
            );

            const newMessages = skipOptimistic
              ? [
                  ...messagesWithoutTemp,
                  {
                    id: `assistant-${crypto.randomUUID()}`,
                    role: 'assistant' as const,
                    content: finalContent,
                    createdAt: new Date().toISOString(),
                    recommendations,
                  },
                ]
              : [
                  ...messagesWithoutTemp,
                  {
                    id: `user-${crypto.randomUUID()}`,
                    role: 'user' as const,
                    content,
                    createdAt: new Date().toISOString(),
                    recommendations: null,
                  },
                  {
                    id: `assistant-${crypto.randomUUID()}`,
                    role: 'assistant' as const,
                    content: finalContent,
                    createdAt: new Date().toISOString(),
                    recommendations,
                  },
                ];

            return {
              ...old,
              chat_messages: newMessages,
            };
          }
        );

        queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        queryClient.setQueryData(
          queryKeys.conversation(conversationId),
          (old: ConversationWithMessages | undefined) => {
            if (!old) return old;
            return {
              ...old,
              chat_messages: old.chat_messages.filter(
                (m) => !m.id.toString().startsWith('temp-')
              ),
            };
          }
        );

        toast({
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Erreur lors de l\'envoi',
          variant: 'destructive',
        });
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [queryClient, toast]
  );

  return {
    streamingContent,
    isStreaming,
    sendStreamingMessage,
    cancelStream,
  };
}
