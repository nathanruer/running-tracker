import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { handleGetRequest, handleApiRequest, handleDeleteRequest } from '@/lib/services/api-handlers';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  return handleGetRequest(
    request,
    async (userId) => {
      const conversation = await prisma.chat_conversations.findFirst({
        where: {
          id: params.id,
          userId,
        },
        include: {
          chat_messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
      }

      return NextResponse.json(conversation);
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

      const conversation = await prisma.chat_conversations.updateMany({
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
      const conversation = await prisma.chat_conversations.deleteMany({
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
