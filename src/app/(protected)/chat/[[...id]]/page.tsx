'use client';

import { useState, useCallback, useTransition, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ChatSidebar } from '@/features/chat/components/chat-sidebar';
import { ChatView } from '@/features/chat/components/chat-view';
import { ChatSkeleton } from '@/features/chat/components/chat-skeleton';
import { useConversations } from '@/features/chat/hooks/use-conversations';

function getIdFromParams(params: ReturnType<typeof useParams>): string | null {
  if (!params.id) return null;
  return Array.isArray(params.id) ? params.id[0] : params.id;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const [, startTransition] = useTransition();

  const urlId = useMemo(() => getIdFromParams(params), [params]);
  const [localId, setLocalId] = useState<string | null>(null);
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);

  const selectedConversationId = localId ?? urlId;

  const { showSkeleton } = useConversations();

  const handleSelectConversation = useCallback((id: string) => {
    setLocalId(id || null);

    startTransition(() => {
      const newUrl = id ? `/chat/${id}` : '/chat';
      window.history.replaceState(null, '', newUrl);
    });
  }, []);

  const handleSelectConversationMobile = useCallback((id: string) => {
    handleSelectConversation(id);
    setIsConversationsOpen(false);
  }, [handleSelectConversation]);

  const handleConversationCreated = useCallback((id: string) => {
    setLocalId(id);
    startTransition(() => {
      router.replace(`/chat/${id}`, { scroll: false });
    });
  }, [router]);

  if (showSkeleton) {
    return <ChatSkeleton mode={selectedConversationId ? 'conversation' : 'landing'} />;
  }

  return (
    <div className="w-full h-full md:py-8 px-0 md:px-6 xl:px-12 flex flex-col overflow-hidden bg-background">
      <div className="mx-auto w-full max-w-[90rem] h-full flex flex-col relative min-h-0">
        <div className="flex items-center justify-between px-6 py-6 md:hidden shrink-0">
          <h1 className="text-3xl font-black text-primary tracking-tighter">Coach IA</h1>
          <Button
            onClick={() => setIsConversationsOpen(true)}
            size="icon"
            variant="ghost"
            title="Voir toutes les conversations"
            className="rounded-full h-11 w-11 text-muted-foreground/30 hover:text-primary hover:bg-muted"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>

        <Sheet open={isConversationsOpen} onOpenChange={setIsConversationsOpen}>
          <SheetContent side="right" className="w-full sm:w-[400px] p-0 border-l border-border/10 bg-background">
            <SheetHeader className="sr-only">
              <SheetTitle>Conversations</SheetTitle>
            </SheetHeader>
            <div className="h-full flex flex-col">
              <ChatSidebar
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversationMobile}
                isMobile={true}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex md:h-[calc(100vh-12rem)] gap-6 min-h-0 overflow-hidden">
          <div className="hidden md:block">
            <ChatSidebar
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              isMobile={false}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <ChatView
              key={selectedConversationId || 'new'}
              conversationId={selectedConversationId}
              onConversationCreated={handleConversationCreated}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
