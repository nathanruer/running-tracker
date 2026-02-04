import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { handleApiRequest } from '@/server/services/api-handlers';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const body = await request.json();
      if (!body?.content || typeof body.content !== 'string') {
        return NextResponse.json({ error: 'Contenu invalide' }, { status: 400 });
      }

      const content = body.content.trim();
      if (!content) {
        return NextResponse.json({ error: 'Message vide' }, { status: 400 });
      }

      const title = content.length > 50 ? content.substring(0, 50) + '...' : content;

      const conversation = await prisma.chat_conversations.create({
        data: {
          userId,
          title,
        },
      });

      const message = await prisma.chat_messages.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content,
        },
      });

      return NextResponse.json({
        conversationId: conversation.id,
        messageId: message.id,
      });
    },
    { logContext: 'create-conversation-with-message' }
  );
}
