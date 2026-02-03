import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest } from '@/lib/services/api-handlers';
import { createPlannedSession, logSessionWriteError } from '@/lib/domain/sessions/sessions-write';
import { fetchSessionById } from '@/lib/domain/sessions/sessions-read';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const body = await request.json();
      const {
        sessionType,
        targetDuration,
        targetDistance,
        targetPace,
        targetHeartRateBpm,
        targetRPE,
        intervalDetails,
        plannedDate,
        recommendationId,
        comments,
      } = body;

      try {
        const plan = await createPlannedSession(
          {
            sessionType,
            targetDuration,
            targetDistance,
            targetPace,
            targetHeartRateBpm,
            targetRPE,
            intervalDetails,
            plannedDate,
            recommendationId,
            comments,
          },
          userId
        );

        const session = await fetchSessionById(userId, plan.id);
        return NextResponse.json({ session });
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'create-planned' });
        return NextResponse.json(
          { error: 'Erreur lors de la création de la séance planifiée.' },
          { status: 500 }
        );
      }
    },
    { logContext: 'create-planned-session' }
  );
}
