import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/infrastructure/logger';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const session = await prisma.training_sessions.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: 'Séance non trouvée' }, { status: 404 });
    }

    if (session.userId !== userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    if (session.status !== 'planned') {
      return NextResponse.json(
        { error: 'Cette séance n\'est pas planifiée' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      date,
      duration,
      distance,
      avgPace,
      avgHeartRate,
      perceivedExertion,
      comments,
    } = body;

    const completedSession = await prisma.training_sessions.update({
      where: { id },
      data: {
        status: 'completed',
        date: new Date(date),
        duration,
        distance: parseFloat(distance),
        avgPace,
        avgHeartRate: parseInt(avgHeartRate, 10) || 0,
        perceivedExertion: perceivedExertion ? parseInt(perceivedExertion, 10) : 0,
        comments: comments || '',
      },
    });

    logger.info({ sessionId: id }, 'Planned session completed');

    await recalculateSessionNumbers(userId);

    const refreshed = await prisma.training_sessions.findUnique({
      where: { id }
    });
    
    return NextResponse.json(refreshed || completedSession);
  } catch (error) {
    logger.error({ error }, 'Failed to complete planned session');
    return NextResponse.json(
      { error: 'Erreur lors de la complétion de la séance' },
      { status: 500 }
    );
  }
}
