import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { sessionSchema } from '@/lib/validators';
import { logger } from '@/lib/logger';
import { recalculateSessionNumbers } from '@/lib/session-utils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '0');
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const sessionType = searchParams.get('type');

  const whereClause: any = { userId };
  if (sessionType && sessionType !== 'all') {
    whereClause.sessionType = sessionType;
  }

  const sessions = await prisma.trainingSession.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
    ...(limit > 0 ? { take: limit } : {}),
    ...(offset > 0 ? { skip: offset } : {}),
  });

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const payload = sessionSchema.parse(await request.json());

    const session = await prisma.trainingSession.create({
      data: {
        ...payload,
        date: new Date(payload.date),
        sessionNumber: 1,
        week: 1,
        userId,
      },
    });

    await recalculateSessionNumbers(userId);

    const updatedSession = await prisma.trainingSession.findUnique({
      where: { id: session.id },
    });

    return NextResponse.json({ session: updatedSession }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Payload invalide' },
        { status: 400 },
      );
    }
    logger.error({ error, userId }, 'Failed to create training session');
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    );
  }
}

