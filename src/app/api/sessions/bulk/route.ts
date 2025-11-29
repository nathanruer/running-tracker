import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { sessionSchema } from '@/lib/validation';
import { logger } from '@/lib/infrastructure/logger';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
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

    const createdSessions = await Promise.all(
      validatedSessions.map((session) =>
        prisma.training_sessions.create({
          data: {
            ...session,
            date: new Date(session.date),
            sessionNumber: 1,
            week: 1,
            userId,
          },
        })
      )
    );

    await recalculateSessionNumbers(userId);

    return NextResponse.json(
      {
        message: `${createdSessions.length} séance(s) importée(s) avec succès`,
        count: createdSessions.length,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          details: error.issues.map((issue) => issue.message),
        },
        { status: 400 }
      );
    }
    logger.error({ error, userId }, 'Failed to bulk import sessions');
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
