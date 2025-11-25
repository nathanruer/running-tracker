import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { sessionSchema } from '@/lib/validators';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const sessions = await prisma.trainingSession.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
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
        userId,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
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

