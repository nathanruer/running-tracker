'use client';

import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/features/chat/components/chat-sidebar';
import { ChatView } from '@/features/chat/components/chat-view';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export default function ChatPage() {
  const router = useRouter();

  const { isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Erreur lors du chargement des conversations');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
        <div className="mx-auto max-w-[90rem]">
          <h1 className="text-4xl font-bold text-gradient mb-8 md:hidden">Coach IA</h1>

          {/* Mobile skeleton - show conversation list */}
          <div className="md:hidden">
            <div className="w-full border-0 shadow-none h-full flex flex-col p-4">
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
            </div>
          </div>

          {/* Desktop skeleton - show sidebar and empty chat */}
          <div className="hidden md:flex h-[calc(100vh-12rem)] gap-4">
            <div className="hidden md:block">
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
            </div>

            <div className="flex-1 flex flex-col">
              <Card className="h-full flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-2xl space-y-8">
                  {/* Title and subtitle skeleton */}
                  <div className="text-center space-y-3">
                    <div className="h-8 w-3/4 mx-auto animate-pulse rounded bg-muted" />
                    <div className="h-4 w-1/2 mx-auto animate-pulse rounded bg-muted/70" />
                  </div>

                  {/* Input skeleton */}
                  <div className="relative">
                    <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 animate-pulse rounded bg-muted/50" />
                  </div>
                </div>
              </Card>
            </div>
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
          <div className="hidden md:block">
            <ChatSidebar
              selectedConversationId={null}
              onSelectConversation={(id) => router.push(`/chat/${id}`)}
              isMobile={false}
            />
          </div>

          <div className="flex-1 flex flex-col">
            <ChatView conversationId={null} />
          </div>
        </div>
      </div>
    </div>
  );
}
