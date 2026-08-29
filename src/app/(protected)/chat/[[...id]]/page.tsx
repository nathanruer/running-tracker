import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { queryKeys } from '@/lib/constants/query-keys';
import { verifySessionToken } from '@/server/auth';
import { getUserProfilePayload } from '@/server/domain/users/user-profile';
import {
  fetchConversationSummaries,
  fetchConversationWithMessages,
} from '@/server/domain/conversations/conversations-read';
import ChatClient from '../chat-client';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) {
    redirect('/');
  }
  const userId = payload.userId;

  const { id } = await params;
  const conversationId = id?.[0] ?? null;

  const [user, conversations, conversation] = await Promise.all([
    getUserProfilePayload(userId),
    fetchConversationSummaries(userId),
    conversationId ? fetchConversationWithMessages(userId, conversationId) : null,
  ]);

  if (!user) {
    redirect('/');
  }

  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.user(), user);
  queryClient.setQueryData(queryKeys.conversations(), conversations);
  if (conversationId && conversation) {
    queryClient.setQueryData(queryKeys.conversation(conversationId), conversation);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatClient />
    </HydrationBoundary>
  );
}
