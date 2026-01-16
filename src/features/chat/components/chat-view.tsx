'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getSessions, getConversation } from '@/lib/services/api-client';
import { useChatMutations } from '../hooks/use-chat-mutations';
import { useConversationCreation } from '../hooks/use-conversation-creation';
import { MessageList } from './message-list';

export type { Message, ConversationWithMessages as Conversation } from '@/lib/services/api-client';

interface ChatViewProps {
  conversationId: string | null;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const [input, setInput] = useState('');

  const { optimisticMessages, isWaitingForResponse, createConversationWithMessage } =
    useConversationCreation({ conversationId });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions', 'history'],
    queryFn: () => getSessions(50, 0, 'all'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: conversation, isLoading: isConversationLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId && conversationId !== '',
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    meta: { silentError: true },
  });

  const {
    acceptSession,
    deleteSession,
    sendMessage,
    isSending,
    loadingSessionId,
  } = useChatMutations(conversationId);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    if (!conversationId) {
      await createConversationWithMessage(userMessage);
      return;
    }

    sendMessage(userMessage);
  };

  if (!conversationId && optimisticMessages.length === 0) {
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
              disabled={isWaitingForResponse}
              className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base px-5 h-10 md:h-12"
            />
            <Button
              data-testid="chat-send-button"
              onClick={handleSendMessage}
              disabled={isWaitingForResponse || isSending || !input.trim()}
              size="icon"
              variant="action"
              className="h-9 w-9 md:h-10 md:w-10 rounded-full shrink-0 shadow-lg shadow-violet-600/20"
            >
              {isWaitingForResponse ? (
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
        messages={conversationId ? (conversation?.chat_messages || []) : optimisticMessages}
        isLoading={conversationId ? isConversationLoading : false}
        isSending={conversationId ? isSending : isWaitingForResponse}
        loadingSessionId={loadingSessionId}
        allSessions={allSessions}
        onAcceptSession={conversationId ? acceptSession : () => {}}
        onDeleteSession={conversationId ? deleteSession : () => {}}
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
            disabled={conversationId ? isSending : isWaitingForResponse}
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base px-5 h-10 md:h-12"
          />
          <Button
            data-testid="chat-send-button"
            onClick={handleSendMessage}
            disabled={conversationId ? (isSending || !input.trim()) : (isWaitingForResponse || !input.trim())}
            size="icon"
            variant="action"
            className="h-9 w-9 md:h-10 md:w-10 rounded-full shrink-0 shadow-lg shadow-violet-600/20"
          >
            {(conversationId ? isSending : isWaitingForResponse) ? (
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
