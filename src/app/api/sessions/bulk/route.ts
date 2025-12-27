import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { sessionSchema } from '@/lib/validation';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { handleApiRequest } from '@/lib/services/api-handlers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const { sessions } = await request.json();

      if (!Array.isArray(sessions) || sessions.length === 0) {
        return NextResponse.json(
          { error: 'Le tableau de séances est requis' },
          { status: 400 }
        );
      }

      const validatedSessions = sessions.map((session) =>
        sessionSchema.parse(session)
      );

      const result = await prisma.training_sessions.createMany({
        data: validatedSessions.map((session) => {
          const { intervalDetails, ...sessionData } = session;
          return {
            ...sessionData,
            intervalDetails: intervalDetails || Prisma.JsonNull,
            date: new Date(session.date),
            sessionNumber: 1,
            week: 1,
            userId,
            status: 'completed',
          };
        }),
      });

      await recalculateSessionNumbers(userId);

      return NextResponse.json(
        {
          message: `${result.count} séance(s) importée(s) avec succès`,
          count: result.count,
        },
        { status: 201 }
      );
    },
    { logContext: 'bulk-import-sessions' }
  );
}

export async function DELETE(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const { ids } = await request.json();

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: 'Le tableau d\'identifiants est requis' },
          { status: 400 }
        );
      }

      const result = await prisma.training_sessions.deleteMany({
        where: {
          id: { in: ids },
          userId: userId,
        },
      });

      await recalculateSessionNumbers(userId);

      return NextResponse.json(
        {
          message: `${result.count} séance(s) supprimée(s) avec succès`,
          count: result.count,
        },
        { status: 200 }
      );
    },
    { logContext: 'bulk-delete-sessions' }
  );
}
