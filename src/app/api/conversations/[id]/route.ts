import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { handleGetRequest, handleApiRequest, handleDeleteRequest } from '@/server/services/api-handlers';
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  return handleGetRequest(
    request,
    async (userId) => {
      const conversation = await prisma.conversations.findFirst({
        where: {
          id: params.id,
          userId,
        },
        include: {
          conversation_messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              conversation_message_payloads: true,
            },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
      }

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
          createdAt: message.createdAt,
        };
      });

      const { conversation_messages: _conversation_messages, ...rest } = conversation;
      void _conversation_messages;

      return NextResponse.json({
        ...rest,
        chat_messages: chatMessages,
      });
    },
    { logContext: 'get-conversation' }
  );
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const { title } = await request.json();

      if (!title || typeof title !== 'string') {
        return NextResponse.json({ error: 'Titre invalide' }, { status: 400 });
      }

      const conversation = await prisma.conversations.updateMany({
        where: {
          id: params.id,
          userId,
        },
        data: { title },
      });

      if (conversation.count === 0) {
        return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    },
    { logContext: 'update-conversation' }
  );
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  return handleDeleteRequest(
    request,
    async (userId) => {
      const conversation = await prisma.conversations.deleteMany({
        where: {
          id: params.id,
          userId,
        },
      });

      if (conversation.count === 0) {
        return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    },
    { logContext: 'delete-conversation' }
  );
}
