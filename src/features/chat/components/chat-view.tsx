'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getSessions } from '@/lib/services/api-client';
import { useChatMutations } from '../hooks/use-chat-mutations';
import { useConversationCreation } from '../hooks/use-conversation-creation';
import { MessageList } from './message-list';
import type { AIRecommendedSession } from '@/lib/types';

export interface Recommendations {
  recommended_sessions?: AIRecommendedSession[];
  [key: string]: unknown;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  recommendations: Recommendations | null;
  model?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  chat_messages: Message[];
}

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

  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Erreur lors du chargement de la conversation');
      return response.json() as Promise<Conversation>;
    },
    enabled: !!conversationId,
    staleTime: 0,
    refetchOnMount: true,
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

  if (!conversationId) {
    if (optimisticMessages.length === 0) {
      return (
        <Card className="h-full flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center text-muted-foreground">
              <h3 className="text-2xl font-medium mb-3">Quelle est votre demande aujourd&apos;hui ?</h3>
              <p className="text-sm">Posez une question ou demandez des conseils d&apos;entraînement</p>
            </div>

            <div className="relative">
              <Input
                placeholder="Ex: Je voudrais 2 séances en plus pour cette semaine..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isWaitingForResponse}
                className="pr-12"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isWaitingForResponse || !input.trim()}
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              >
                {isWaitingForResponse ? (
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

    return (
      <Card className="h-full flex flex-col">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold truncate">Nouvelle conversation</h2>
        </div>

        <MessageList
          messages={optimisticMessages}
          isLoading={false}
          isSending={isWaitingForResponse}
          loadingSessionId={null}
          allSessions={allSessions}
          onAcceptSession={() => {}}
          onDeleteSession={() => {}}
        />

        <div className="border-t p-4">
          <div className="relative">
            <Input
              placeholder="Ex: Je voudrais 2 séances en plus pour cette semaine..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isWaitingForResponse}
              className="pr-12"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isWaitingForResponse || !input.trim()}
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              {isWaitingForResponse ? (
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

  return (
    <Card className="h-full flex flex-col">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold truncate">{conversation?.title}</h2>
      </div>

      <MessageList
        messages={conversation?.chat_messages || []}
        isLoading={false}
        isSending={isSending}
        loadingSessionId={loadingSessionId}
        allSessions={allSessions}
        onAcceptSession={acceptSession}
        onDeleteSession={deleteSession}
      />

      <div className="border-t p-4">
        <div className="relative">
          <Input
            placeholder="Ex: Je voudrais 2 séances en plus pour cette semaine..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isSending}
            className="pr-12"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !input.trim()}
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            {isSending ? (
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
