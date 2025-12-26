'use client';

import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/features/chat/components/chat-sidebar';
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
    if (conversations.length > 0 && window.innerWidth >= 768) {
      router.push(`/chat/${conversations[0].id}`);
    }
  }, [conversations, router]);

  return (
    <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
      <div className="mx-auto max-w-[90rem]">
        <h1 className="text-4xl font-bold text-gradient mb-8 md:hidden">Coach IA</h1>

        <div className="md:hidden">
          <ChatSidebar
            selectedConversationId={null}
            onSelectConversation={(id) => router.push(`/chat/${id}`)}
            isMobile={true}
          />
        </div>

        <div className="hidden md:flex h-[calc(100vh-12rem)] gap-4">
          <ChatSidebar
            selectedConversationId={null}
            onSelectConversation={(id) => router.push(`/chat/${id}`)}
            isMobile={false}
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
