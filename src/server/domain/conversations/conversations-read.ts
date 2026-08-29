import 'server-only';
import { prisma } from '@/server/database';

export async function fetchConversationSummaries(userId: string) {
  const conversations = await prisma.conversations.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { conversation_messages: true },
      },
    },
  });

  return conversations.map(({ _count, createdAt, updatedAt, ...rest }) => ({
    ...rest,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    _count: { chat_messages: _count.conversation_messages },
  }));
}

export async function fetchConversationWithMessages(userId: string, conversationId: string) {
  const conversation = await prisma.conversations.findFirst({
    where: { id: conversationId, userId },
    include: {
      conversation_messages: {
        where: { role: { not: 'system' } },
        orderBy: { createdAt: 'asc' },
        include: {
          conversation_message_payloads: true,
        },
      },
    },
  });

  if (!conversation) return null;

  const chatMessages = conversation.conversation_messages.map((message) => {
    const payload = message.conversation_message_payloads.find(
      (item) => item.payloadType === 'recommendations'
    );

    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      model: message.model ?? null,
      recommendations: payload?.payload ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  });

  const { conversation_messages: _conversation_messages, createdAt, updatedAt, ...rest } = conversation;
  void _conversation_messages;

  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    chat_messages: chatMessages,
  };
}
