import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest } from '@/server/services/api-handlers';
import { createPlannedSession, logSessionWriteError } from '@/server/domain/sessions/sessions-write';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const { sessions } = await request.json();

      if (!Array.isArray(sessions) || sessions.length === 0) {
        return NextResponse.json(
          { error: 'Le tableau de séances est requis et ne peut pas être vide' },
          { status: 400 }
        );
      }

      try {
        const createdSessions = [];
        for (const session of sessions) {
          const plan = await createPlannedSession(
            {
              sessionType: session.sessionType,
              targetDuration: session.targetDuration,
              targetDistance: session.targetDistance,
              targetPace: session.targetPace,
              targetHeartRateBpm: session.targetHeartRateBpm,
              targetRPE: session.targetRPE,
              intervalDetails: session.intervalDetails,
              plannedDate: session.plannedDate,
              recommendationId: session.recommendationId,
              comments: session.comments,
            },
            userId
          );
          const createdSession = await fetchSessionById(userId, plan.id);
          if (createdSession) createdSessions.push(createdSession);
        }

        return NextResponse.json({
          message: `${createdSessions.length} séance${createdSessions.length > 1 ? 's' : ''} ajoutée${createdSessions.length > 1 ? 's' : ''} avec succès`,
          sessions: createdSessions,
          count: createdSessions.length,
        });
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'planned-bulk' });
        return NextResponse.json(
          { error: 'Erreur lors de la création des séances planifiées.' },
          { status: 500 }
        );
      }
    },
    { logContext: 'create-bulk-planned-sessions' }
  );
}
