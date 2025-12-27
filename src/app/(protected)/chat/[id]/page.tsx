'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { ChatSidebar } from '@/features/chat/components/chat-sidebar';
import { ChatView } from '@/features/chat/components/chat-view';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);

  // Load conversations for the sidebar
  const { isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Erreur lors du chargement des conversations');
      return response.json();
    },
  });

  // Load current conversation
  const { isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Erreur lors du chargement de la conversation');
      return response.json();
    },
    enabled: !!conversationId,
    staleTime: 0,
    refetchOnMount: true,
  });

  const isGlobalLoading = conversationsLoading || conversationLoading;

  if (isGlobalLoading) {
    return (
      <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
        <div className="mx-auto max-w-[90rem]">
          <div className="flex items-center justify-between mb-8 md:hidden">
            <h1 className="text-4xl font-bold text-gradient">Coach IA</h1>
            <Button
              size="icon"
              variant="outline"
              disabled
              title="Chargement..."
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex h-[calc(100vh-12rem)] gap-4">
            {/* Desktop sidebar skeleton */}
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

            {/* Mobile sidebar skeleton */}
            <div className="md:hidden flex-1">
              <Card className="h-full flex flex-col">
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
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Desktop conversation skeleton */}
            <div className="hidden md:block flex-1">
              <Card className="h-full flex flex-col">
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
      </div>
    );
  }

  return (
    <div className="w-full py-6 md:py-8 px-4 md:px-6 xl:px-12">
      <div className="mx-auto max-w-[90rem]">
        <div className="flex items-center justify-between mb-8 md:hidden">
          <h1 className="text-4xl font-bold text-gradient">Coach IA</h1>
          <Button
            onClick={() => setIsConversationsOpen(true)}
            size="icon"
            variant="outline"
            title="Voir toutes les conversations"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile conversations drawer */}
        <Sheet open={isConversationsOpen} onOpenChange={setIsConversationsOpen}>
          <SheetContent side="right" className="w-[85vw] sm:w-[50vw] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Coach IA</SheetTitle>
            </SheetHeader>
            <div className="pt-12">
              <ChatSidebar
                selectedConversationId={conversationId}
                onSelectConversation={(id) => {
                  if (id) {
                    router.push(`/chat/${id}`);
                  } else {
                    router.push('/chat');
                  }
                  setIsConversationsOpen(false);
                }}
                isMobile={true}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex h-[calc(100vh-12rem)] gap-4">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <ChatSidebar
              selectedConversationId={conversationId}
              onSelectConversation={(id) => {
                if (id) {
                  router.push(`/chat/${id}`);
                } else {
                  router.push('/chat');
                }
              }}
              isMobile={false}
            />
          </div>

          <div className="flex-1 flex flex-col">
            <ChatView conversationId={conversationId} />
          </div>
        </div>
      </div>
    </div>
  );
}
