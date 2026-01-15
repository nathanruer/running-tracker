'use client';

import { useRouter } from 'next/navigation';
import { ChatSidebar } from '@/features/chat/components/chat-sidebar';
import { ChatView } from '@/features/chat/components/chat-view';
import { ChatSkeleton } from '@/features/chat/components/chat-skeleton';
import { useQuery } from '@tanstack/react-query';
import { getConversations } from '@/lib/services/api-client';

export default function ChatPage() {
  const router = useRouter();

  const { isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });

  if (isLoading) {
    return <ChatSkeleton />;
  }

  return (
    <div className="w-full py-4 md:py-8 px-3 md:px-6 xl:px-12">
      <div className="mx-auto max-w-[90rem]">
        <h1 className="text-3xl font-extrabold text-gradient mb-6 md:hidden px-1">Coach IA</h1>

        <div className="md:hidden">
          <ChatSidebar
            selectedConversationId={null}
            onSelectConversation={(id) => router.push(`/chat/${id}`)}
            isMobile={true}
          />
        </div>

        <div className="hidden md:flex h-[calc(100vh-12rem)] gap-6">
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
