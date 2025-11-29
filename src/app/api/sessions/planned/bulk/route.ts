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

    const { sessions } = await request.json();

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json(
        { error: 'Le tableau de séances est requis et ne peut pas être vide' },
        { status: 400 }
      );
    }

    // Get the highest session number to calculate next available numbers
    const allSessions = await prisma.training_sessions.findMany({
      where: { userId },
      select: { sessionNumber: true },
      orderBy: { sessionNumber: 'desc' },
      take: 1,
    });

    let nextSessionNumber = allSessions.length > 0
      ? allSessions[0].sessionNumber + 1
      : 1;

    const firstSession = await prisma.training_sessions.findFirst({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    const createdSessions = [];

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];

      const baseDate = session.plannedDate ? new Date(session.plannedDate) : new Date();

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
          sessionType: session.sessionType,
          status: 'planned',
          targetDuration: session.targetDuration,
          targetDistance: session.targetDistance,
          targetPace: session.targetPace,
          targetHeartRateZone: session.targetHeartRateZone,
          targetHeartRateBpm: session.targetHeartRateBpm,
          targetRPE: session.targetRPE,
          intervalStructure: session.intervalStructure,
          plannedDate: session.plannedDate ? new Date(session.plannedDate) : null,
          recommendationId: session.recommendationId,
          comments: session.comments || '',
        },
      });

      createdSessions.push(plannedSession);
      nextSessionNumber++; // Increment for the next session
    }

    logger.info(
      { count: createdSessions.length, userId },
      'Bulk planned sessions created'
    );

    return NextResponse.json({
      message: `${createdSessions.length} séance(s) ajoutée(s) avec succès`,
      sessions: createdSessions,
      count: createdSessions.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create bulk planned sessions');
    return NextResponse.json(
      { error: 'Erreur lors de la création des séances planifiées' },
      { status: 500 }
    );
  }
}
