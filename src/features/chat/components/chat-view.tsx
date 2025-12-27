'use client';

import { useState } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getSessions } from '@/lib/services/api-client';
import { useChatMutations } from '../hooks/use-chat-mutations';
import { MessageList } from './message-list';
import type { AIRecommendedSession } from '@/lib/types';

interface Recommendations {
  recommended_sessions?: AIRecommendedSession[];
  [key: string]: unknown;
}

interface Message {
  id: string;
  role: string;
  content: string;
  recommendations: Recommendations | null;
  model?: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  chat_messages: Message[];
}

interface ChatViewProps {
  conversationId: string | null;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const [input, setInput] = useState('');

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

  const handleSendMessage = () => {
    if (!input.trim() || !conversationId) return;
    sendMessage(input.trim());
    setInput('');
  };

  if (!conversationId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">Aucune conversation sélectionnée</h3>
          <p className="text-sm">Sélectionnez une conversation ou créez-en une nouvelle</p>
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
        <div className="flex gap-2">
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
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !input.trim()}
            className="shrink-0"
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
