'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatView } from '@/components/chat/chat-view';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

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
            selectedConversationId={conversationId}
            onSelectConversation={(id) => {
              if (id) {
                router.push(`/chat/${id}`);
              } else {
                router.push('/chat');
              }
            }}
          />

          <div className="flex-1 flex flex-col">
            <ChatView conversationId={conversationId} />
          </div>
        </div>
      </div>
    </div>
  );
}
