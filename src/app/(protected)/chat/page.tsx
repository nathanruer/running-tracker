'use client';

import { useEffect } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export default function ChatPage() {
  const router = useRouter();

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Erreur lors du chargement des conversations');
      return response.json();
    },
  });

  useEffect(() => {
    if (conversations.length > 0) {
      router.push(`/chat/${conversations[0].id}`);
    }
  }, [conversations, router]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gradient">Bob - ton coach IA</h1>
        </div>

        <div className="flex h-[calc(100vh-12rem)] gap-4">
          <ChatSidebar
            selectedConversationId={null}
            onSelectConversation={(id) => router.push(`/chat/${id}`)}
          />

          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Aucune conversation sélectionnée</h3>
              <p className="text-sm">Sélectionnez une conversation ou créez-en une nouvelle</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
