import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { findSessionByIdAndUser } from '@/lib/utils/api-helpers';
import { handleApiRequest } from '@/lib/services/api-handlers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const session = await findSessionByIdAndUser(id, userId);

      if (!session) {
        return NextResponse.json(
          { error: 'Séance non trouvée' },
          { status: 404 }
        );
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

      await recalculateSessionNumbers(userId);

      const refreshed = await prisma.training_sessions.findUnique({
        where: { id }
      });

      return NextResponse.json(refreshed || completedSession);
    },
    { logContext: 'complete-planned-session' }
  );
}
