import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/infrastructure/logger';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { validateAuth, findSessionByIdAndUser, handleNotFound, withErrorHandling } from '@/lib/utils/api-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await validateAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const userId = authResult;

  return withErrorHandling(async () => {
    const session = await findSessionByIdAndUser(id, userId);

    if (!session) {
      return handleNotFound('Séance non trouvée');
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
  }, { sessionId: id, userId, operation: 'complete' });
}
