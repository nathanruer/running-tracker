import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const conversation = await prisma.chat_conversations.findFirst({
      where: {
        id,
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
  } catch (error) {
    console.error('Erreur lors de la récupération de la conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la conversation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Titre invalide' }, { status: 400 });
    }

    const conversation = await prisma.chat_conversations.updateMany({
      where: {
        id,
        userId,
      },
      data: { title },
    });

    if (conversation.count === 0) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const conversation = await prisma.chat_conversations.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (conversation.count === 0) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de la conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la conversation' },
      { status: 500 }
    );
  }
}
