import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { jsonError } from '@/lib/utils/api';
import { handleApiRequest } from '@/lib/services/api-handlers';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const body = await request.json();
      if (!body?.content || typeof body.content !== 'string') {
        return jsonError('Contenu invalide');
      }

      const content = body.content.trim();
      if (!content) {
        return jsonError('Message vide');
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
