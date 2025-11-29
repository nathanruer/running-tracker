import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { partialSessionSchema } from '@/lib/validation';
import { logger } from '@/lib/infrastructure/logger';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const updates = partialSessionSchema.parse(await request.json());

    const session = await prisma.training_sessions.findFirst({
      where: { id: params.id, userId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Séance introuvable' },
        { status: 404 },
      );
    }

    await prisma.training_sessions.update({
      where: { id: params.id },
      data: {
        ...updates,
        ...(updates.date && { date: new Date(updates.date) }),
      },
    });

    if (updates.date) {
      await recalculateSessionNumbers(userId);
    }

    const updated = await prisma.training_sessions.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Payload invalide' },
        { status: 400 },
      );
    }
    logger.error({ error, userId, sessionId: params.id }, 'Failed to update training session');
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const session = await prisma.training_sessions.findFirst({
    where: { id: params.id, userId },
  });

  if (!session) {
    return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
  }

  await prisma.training_sessions.delete({ where: { id: params.id } });
  
  await recalculateSessionNumbers(userId);
  
  return NextResponse.json({ message: 'Séance supprimée' });
}


