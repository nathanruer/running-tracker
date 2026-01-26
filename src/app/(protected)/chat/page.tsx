'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function ChatPage() {
  const router = useRouter();
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);

  const { showSkeleton } = useConversations();

  if (showSkeleton) {
    return <ChatSkeleton mode="landing" />;
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
                selectedConversationId={null}
                onSelectConversation={(id) => {
                  if (id) {
                    router.push(`/chat/${id}`);
                  }
                  setIsConversationsOpen(false);
                }}
                isMobile={true}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 flex md:h-[calc(100vh-12rem)] gap-6 min-h-0 overflow-hidden">
          <div className="hidden md:block">
            <ChatSidebar
              selectedConversationId={null}
              onSelectConversation={(id) => router.push(`/chat/${id}`)}
              isMobile={false}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <ChatView conversationId={null} />
          </div>
        </div>
      </div>
    </div>
  );
}
