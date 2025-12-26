'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const [isConversationsOpen, setIsConversationsOpen] = useState(false);

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
