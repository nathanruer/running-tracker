import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { requireAuth } from '@/server/auth/middleware';
import { logger } from '@/server/infrastructure/logger';
import { processStreamingMessage } from '@/server/services/ai/stream-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  const auth = requireAuth(request);
  if (!auth.success) {
    return auth.error;
  }

  const userId = auth.userId;

  let body: { content?: string; skipSaveUserMessage?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.content || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'Contenu invalide' }, { status: 400 });
  }

  const userMessage = body.content;
  const skipSaveUserMessage = body.skipSaveUserMessage === true;

  const conversation = await prisma.chat_conversations.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation non trouvee' }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = processStreamingMessage({
          userId,
          conversationId: params.id,
          userMessage,
          skipSaveUserMessage,
        });

        for await (const event of generator) {
          const sseMessage = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));
        }

        controller.close();
      } catch (error) {
        logger.error({ error }, 'Stream processing error');
        const errorMessage = `data: ${JSON.stringify({ type: 'error', data: 'Une erreur est survenue' })}\n\n`;
        controller.enqueue(encoder.encode(errorMessage));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
