'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getSessions, getConversation } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';
import { useChatMutations } from '../hooks/use-chat-mutations';
import { useConversationCreation } from '../hooks/use-conversation-creation';
import { useStreamingChat } from '../hooks/use-streaming-chat';
import { MessageList } from './message-list';

export type { Message, ConversationWithMessages as Conversation } from '@/lib/services/api-client';

interface ChatViewProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

export function ChatView({ conversationId, onConversationCreated }: ChatViewProps) {
  const [input, setInput] = useState('');
  const processedMessageKey = useRef<string | null>(null);

  const { isCreating, createAndRedirect } = useConversationCreation({ onConversationCreated });

  const { data: allSessions = [] } = useQuery({
    queryKey: queryKeys.sessionsHistory(),
    queryFn: () => getSessions(50, 0, 'all'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: conversation, isLoading: isConversationLoading } = useQuery({
    queryKey: queryKeys.conversation(conversationId),
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId && conversationId !== '',
    staleTime: 30000,
    refetchOnMount: 'always',
    meta: { silentError: true },
  });

  const {
    acceptSession,
    deleteSession,
    loadingSessionId,
  } = useChatMutations(conversationId);

  const {
    streamingContent,
    isStreaming,
    sendStreamingMessage,
  } = useStreamingChat();

  const messages = conversation?.chat_messages ?? [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const needsResponse = conversationId && lastMessage?.role === 'user';

  useEffect(() => {
    if (!needsResponse || isStreaming || !lastMessage || !conversationId) return;

    const messageKey = `${conversationId}-${lastMessage.id}`;
    if (processedMessageKey.current === messageKey) return;

    processedMessageKey.current = messageKey;
    sendStreamingMessage(conversationId, lastMessage.content, {
      skipOptimisticUserMessage: true,
      skipSaveUserMessage: true,
    });
  }, [needsResponse, isStreaming, conversationId, lastMessage, sendStreamingMessage]);

  useEffect(() => {
    processedMessageKey.current = null;
  }, [conversationId]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    if (!conversationId) {
      await createAndRedirect(userMessage);
      return;
    }

    sendStreamingMessage(conversationId, userMessage);
  }, [input, conversationId, createAndRedirect, sendStreamingMessage]);

  if (!conversationId) {
    return (
      <div className="h-full flex flex-col bg-transparent relative">
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center">
          <div className="max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-[0.9]">
              Comment puis-je <br />
              <span className="text-violet-500">vous aider ?</span>
            </h3>
            <p className="text-sm md:text-base text-muted-foreground/50 font-medium max-w-[280px] md:max-w-md mx-auto leading-relaxed">
              Votre coach personnel est là pour optimiser chaque kilomètre de votre progression.
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full p-4 md:p-6 bg-background">
          <div className="relative w-full max-w-4xl mx-auto flex items-center bg-muted/40 backdrop-blur-xl rounded-full border border-border/20 p-1.5 focus-within:border-violet-500/40 shadow-xl transition-all">
            <Input
              data-testid="chat-input"
              placeholder="Programme moi 4 séances pour cette semaine..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isCreating}
              className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base px-5 h-10 md:h-12"
            />
            <Button
              data-testid="chat-send-button"
              onClick={handleSendMessage}
              disabled={isCreating || !input.trim()}
              size="icon"
              variant="action"
              className="h-9 w-9 md:h-10 md:w-10 rounded-full shrink-0"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent relative overflow-hidden">
      <MessageList
        messages={messages}
        isLoading={isConversationLoading}
        isSending={false}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        loadingSessionId={loadingSessionId}
        allSessions={allSessions}
        onAcceptSession={acceptSession}
        onDeleteSession={deleteSession}
      />

      <div className="shrink-0 w-full p-4 md:p-6 bg-background">
        <div className="relative w-full max-w-4xl mx-auto flex items-center bg-muted/40 backdrop-blur-xl rounded-full border border-border/20 p-1.5 focus-within:border-violet-500/40 shadow-xl transition-all">
          <Input
            data-testid="chat-input"
            placeholder="Envoyez un message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isStreaming}
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base px-5 h-10 md:h-12"
          />
          <Button
            data-testid="chat-send-button"
            onClick={handleSendMessage}
            disabled={isStreaming || !input.trim()}
            size="icon"
            variant="action"
            className="h-9 w-9 md:h-10 md:w-10 rounded-full shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
