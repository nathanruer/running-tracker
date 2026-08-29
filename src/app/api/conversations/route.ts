import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { fetchConversationSummaries } from '@/server/domain/conversations/conversations-read';
import { handleGetRequest, handleApiRequest } from '@/server/services/api-handlers';
export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const normalized = await fetchConversationSummaries(userId);

      return NextResponse.json(normalized);
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

      const conversation = await prisma.conversations.create({
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
