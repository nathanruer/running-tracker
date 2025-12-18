import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { sessionSchema } from '@/lib/validation';
import { logger } from '@/lib/infrastructure/logger';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

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
  const status = searchParams.get('status');

  const whereClause: any = { userId };

  if (status && status !== 'all') {
    whereClause.status = status;
  }

  if (sessionType && sessionType !== 'all') {
    whereClause.sessionType = sessionType;
  }

  const sessions = await prisma.training_sessions.findMany({
    where: whereClause,
    orderBy: [
      { status: 'desc' },
      { sessionNumber: 'desc' },
    ],
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

    const stats = await prisma.training_sessions.aggregate({
      where: { userId },
      _max: { sessionNumber: true },
    });
    const nextNumber = (stats._max.sessionNumber ?? 0) + 1;

    const { intervalDetails, ...sessionData } = payload;
    const session = await prisma.training_sessions.create({
      data: {
        ...sessionData,
        intervalDetails: intervalDetails || Prisma.JsonNull,
        date: new Date(payload.date),
        sessionNumber: nextNumber,
        week: 1,
        userId,
        status: 'completed',
      },
    });

    await recalculateSessionNumbers(userId);

    const refreshedSession = await prisma.training_sessions.findUnique({
      where: { id: session.id }
    });

    return NextResponse.json({ session: refreshedSession || session }, { status: 201 });
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

