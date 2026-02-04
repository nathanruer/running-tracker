import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { handleGetRequest, handleApiRequest } from '@/server/services/api-handlers';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const conversations = await prisma.chat_conversations.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { chat_messages: true },
          },
        },
      });

      return NextResponse.json(conversations);
    },
    { logContext: 'get-conversations' }
  );
}

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const { title } = await request.json();

      if (!title || typeof title !== 'string') {
        return NextResponse.json({ error: 'Titre invalide' }, { status: 400 });
      }

      const conversation = await prisma.chat_conversations.create({
        data: {
          title,
          userId,
        },
      });

      return NextResponse.json(conversation, { status: 201 });
    },
    { logContext: 'create-conversation' }
  );
}
