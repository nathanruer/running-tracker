import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/infrastructure/logger';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionType,
      targetDuration,
      targetDistance,
      targetPace,
      targetHeartRateZone,
      targetHeartRateBpm,
      targetRPE,
      intervalStructure,
      plannedDate,
      recommendationId,
      comments,
    } = body;

    // Always calculate the next available session number dynamically
    const allSessions = await prisma.training_sessions.findMany({
      where: { userId },
      select: { sessionNumber: true },
      orderBy: { sessionNumber: 'desc' },
    });

    const nextSessionNumber = allSessions.length > 0
      ? allSessions[0].sessionNumber + 1
      : 1;

    const baseDate = plannedDate ? new Date(plannedDate) : new Date();
    const firstSession = await prisma.training_sessions.findFirst({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    let week = 1;
    if (firstSession && firstSession.date) {
      const diffTime = Math.abs(baseDate.getTime() - firstSession.date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      week = Math.floor(diffDays / 7) + 1;
    }

    const plannedSession = await prisma.training_sessions.create({
      data: {
        userId,
        sessionNumber: nextSessionNumber,
        week,
        sessionType,
        status: 'planned',
        targetDuration,
        targetDistance,
        targetPace,
        targetHeartRateZone,
        targetHeartRateBpm,
        targetRPE,
        intervalStructure,
        plannedDate: plannedDate ? new Date(plannedDate) : null,
        recommendationId,
        comments: comments || '',
      },
    });

    logger.info({ sessionId: plannedSession.id, sessionNumber: nextSessionNumber }, 'Planned session created');

    return NextResponse.json(plannedSession);
  } catch (error) {
    logger.error({ error }, 'Failed to create planned session');
    return NextResponse.json(
      { error: 'Erreur lors de la création de la séance planifiée' },
      { status: 500 }
    );
  }
}
