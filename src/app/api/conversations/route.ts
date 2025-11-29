import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

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
  } catch (error) {
    console.error('Erreur lors de la récupération des conversations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

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
  } catch (error) {
    console.error('Erreur lors de la création de la conversation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la conversation' },
      { status: 500 }
    );
  }
}
