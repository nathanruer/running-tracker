import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { partialSessionSchema } from '@/lib/validation';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { findSessionByIdAndUser } from '@/lib/utils/api-helpers';
import { handleApiRequest } from '@/lib/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  return handleApiRequest(
    request,
    partialSessionSchema,
    async (updates, userId) => {
      const session = await findSessionByIdAndUser(params.id, userId);

      if (!session) {
        return NextResponse.json(
          { error: 'Séance introuvable' },
          { status: HTTP_STATUS.NOT_FOUND }
        );
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
    },
    { logContext: 'update-session' }
  );
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const session = await findSessionByIdAndUser(params.id, userId);

      if (!session) {
        return NextResponse.json(
          { error: 'Séance introuvable' },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      await prisma.training_sessions.delete({ where: { id: params.id } });

      await recalculateSessionNumbers(userId);

      return NextResponse.json({ message: 'Séance supprimée' });
    },
    { logContext: 'delete-session' }
  );
}

