'use client';

import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/features/chat/components/chat-sidebar';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export default function ChatPage() {
  const router = useRouter();

  const { data: conversations = [], isLoading } = useQuery({
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

  // Will redirect on desktop if conversations exist
  const willRedirect = typeof window !== 'undefined' && window.innerWidth >= 768 && (isLoading || conversations.length > 0);

  if (isLoading || willRedirect) {
    return (
      <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
        <div className="mx-auto max-w-[90rem]">
          <h1 className="text-4xl font-bold text-gradient mb-8 md:hidden">Coach IA</h1>

          {/* Mobile skeleton - show conversation list */}
          <div className="md:hidden">
            <Card className="w-full border-0 shadow-none h-full flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Conversations</h2>
                <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="flex-1 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="h-4 w-4 animate-pulse rounded bg-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="h-8 w-8 animate-pulse rounded bg-muted/50" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Desktop skeleton - show full chat view with conversation */}
          <div className="hidden md:flex h-[calc(100vh-12rem)] gap-4">
            <Card className="w-80 h-full flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Conversations</h2>
                <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 rounded-lg"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="h-4 w-4 animate-pulse rounded bg-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="h-8 w-8 animate-pulse rounded bg-muted/50" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex-1 flex flex-col">
              <div className="border-b p-4">
                <div className="h-7 w-64 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex justify-end">
                  <div className="bg-muted/50 rounded-lg px-4 py-2 max-w-[80%]">
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-4 border border-border/30 space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" style={{ animationDelay: '100ms' }} />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-muted" style={{ animationDelay: '200ms' }} />
                    <div className="h-4 w-4/6 animate-pulse rounded bg-muted" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-muted/50 rounded-lg px-4 py-2 max-w-[80%]">
                    <div className="h-4 w-56 animate-pulse rounded bg-muted" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-4 border border-border/30 space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" style={{ animationDelay: '500ms' }} />
                    <div className="h-4 w-11/12 animate-pulse rounded bg-muted" style={{ animationDelay: '600ms' }} />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" style={{ animationDelay: '700ms' }} />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-muted" style={{ animationDelay: '800ms' }} />
                  </div>
                </div>
              </div>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <div className="flex-1 h-10 animate-pulse rounded-md bg-muted" />
                  <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
