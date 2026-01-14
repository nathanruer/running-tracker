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
        <Card className="h-full flex flex-col items-center justify-center p-8 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="w-full max-w-2xl space-y-12">
            <div className="text-center space-y-4">
              <h3 className="text-4xl font-extrabold tracking-tighter text-foreground">
                Comment puis-je vous aider ?
              </h3>
              <p className="text-muted-foreground/60 font-medium max-w-md mx-auto">
                Votre coach personnel est là pour optimiser chaque kilomètre de votre progression.
              </p>
            </div>

            <div className="relative group">
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
                className="pr-16 h-16 rounded-2xl bg-muted/20 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 text-lg px-6 transition-all"
              />
              <Button
                data-testid="chat-send-button"
                onClick={handleSendMessage}
                disabled={isWaitingForResponse || isSending || !input.trim()}
                size="icon"
                className="absolute right-2 top-2 h-12 w-12 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
              >
                {isWaitingForResponse ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="h-full flex flex-col rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
        <div className="border-b border-border/40 px-8 py-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 mb-1">Coach IA</span>
            <h2 className="text-xl font-bold tracking-tight truncate">Nouvelle conversation</h2>
          </div>
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

        <div className="border-t border-border/40 px-8 py-6">
          <div className="relative">
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
              disabled={isWaitingForResponse}
              className="pr-16 h-14 rounded-2xl bg-muted/20 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 text-base px-6 transition-all"
            />
            <Button
              data-testid="chat-send-button"
              onClick={handleSendMessage}
              disabled={isWaitingForResponse || !input.trim()}
              size="icon"
              className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all"
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
    <Card className="h-full flex flex-col rounded-[2.5rem] border-none bg-card overflow-hidden">
      <div className="border-b border-border/40 px-8 py-6">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold tracking-tight truncate">{conversation?.title}</h2>
        </div>
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

      <div className="border-t border-border/40 px-8 py-6">
        <div className="relative">
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
            disabled={isSending}
            className="pr-16 h-14 rounded-2xl bg-muted/20 border-border/40 focus:border-violet-500/50 focus:ring-violet-500/20 text-base px-6 transition-all"
          />
          <Button
            data-testid="chat-send-button"
            onClick={handleSendMessage}
            disabled={isSending || !input.trim()}
            size="icon"
            className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white active:scale-95 transition-all"
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
