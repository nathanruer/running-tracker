'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  // Case: No conversation selected and no activity yet
  if (!conversationId && optimisticMessages.length === 0) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden relative">
        <div className="w-full space-y-12">
          <div className="text-center space-y-4">
            <h3 className="text-4xl font-extrabold tracking-tighter text-foreground">
              Comment puis-je vous aider ?
            </h3>
            <p className="text-muted-foreground/60 font-medium max-w-md mx-auto">
              Votre coach personnel est là pour optimiser chaque kilomètre de votre progression.
            </p>
          </div>

          <div className="max-w-2xl mx-auto relative group px-16">
            <div className="relative flex items-center bg-muted/80 backdrop-blur-md rounded-3xl border border-border/40 p-1.5 focus-within:border-violet-500/30 transition-all">
              <Input
                data-testid="chat-input"
                placeholder="Ex: Programme moi 4 séances pour cette semaine..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isWaitingForResponse}
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-5 h-12"
              />
              <Button
                data-testid="chat-send-button"
                onClick={handleSendMessage}
                disabled={isWaitingForResponse || isSending || !input.trim()}
                size="icon"
                variant="action"
                className="h-10 w-10 !rounded-2xl"
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
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden relative">
      <MessageList
        messages={conversationId ? (conversation?.chat_messages || []) : optimisticMessages}
        isLoading={conversationId ? isConversationLoading : false}
        isSending={conversationId ? isSending : isWaitingForResponse}
        loadingSessionId={loadingSessionId}
        allSessions={allSessions}
        onAcceptSession={conversationId ? acceptSession : () => {}}
        onDeleteSession={conversationId ? deleteSession : () => {}}
      />

      <div className="absolute bottom-6 left-0 right-0 px-6 md:px-16 pointer-events-none flex justify-center">
        <div className="relative w-full max-w-4xl flex items-center bg-muted rounded-3xl border border-border/40 p-1.5 focus-within:border-violet-500/40 transition-all pointer-events-auto">
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
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-5 h-12"
          />
          <Button
            data-testid="chat-send-button"
            onClick={handleSendMessage}
            disabled={conversationId ? (isSending || !input.trim()) : (isWaitingForResponse || !input.trim())}
            size="icon"
            variant="action"
            className="h-10 w-10 !rounded-2xl"
          >
            {(conversationId ? isSending : isWaitingForResponse) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
