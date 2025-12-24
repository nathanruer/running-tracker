import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { partialSessionSchema } from '@/lib/validation';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { validateAuth, findSessionByIdAndUser, handleNotFound, withErrorHandling } from '@/lib/utils/api-helpers';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const authResult = await validateAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const userId = authResult;

  return withErrorHandling(async () => {
    const updates = partialSessionSchema.parse(await request.json());

    const session = await findSessionByIdAndUser(params.id, userId);

    if (!session) {
      return handleNotFound('Séance introuvable');
    }

    const dateUpdate = updates.date !== undefined
      ? updates.date === ''
        ? { date: null }
        : { date: new Date(updates.date) }
      : {};

    const { intervalDetails, ...restUpdates } = updates;
    const intervalDetailsUpdate = intervalDetails !== undefined
      ? { intervalDetails: intervalDetails || Prisma.JsonNull }
      : {};

    const updated = await prisma.training_sessions.update({
      where: { id: params.id },
      data: {
        ...restUpdates,
        ...dateUpdate,
        ...intervalDetailsUpdate,
      },
    });

    if (updates.date !== undefined) {
      await recalculateSessionNumbers(userId);
      const refreshed = await prisma.training_sessions.findUnique({
        where: { id: params.id }
      });
      return NextResponse.json({ session: refreshed || updated });
    }

    return NextResponse.json({ session: updated });
  }, { userId, sessionId: params.id, operation: 'update' });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const authResult = await validateAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const userId = authResult;

  const session = await findSessionByIdAndUser(params.id, userId);

  if (!session) {
    return handleNotFound('Séance introuvable');
  }

  await prisma.training_sessions.delete({ where: { id: params.id } });
  
  await recalculateSessionNumbers(userId);
  
  return NextResponse.json({ message: 'Séance supprimée' });
}

