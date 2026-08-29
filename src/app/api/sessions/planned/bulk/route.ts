import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest } from '@/server/services/api-handlers';
import { bulkPlannedSchema } from '@/lib/validation';
import { createPlannedSession, logSessionWriteError, recalculateSessionNumbers } from '@/server/domain/sessions/sessions-write';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    bulkPlannedSchema,
    async ({ sessions }, userId) => {
      try {
        const createdSessions = [];
        for (const session of sessions) {
          const plan = await createPlannedSession(session, userId, { skipRecalculate: true });
          const createdSession = await fetchSessionById(userId, plan.id);
          if (createdSession) createdSessions.push(createdSession);
        }
        await recalculateSessionNumbers(userId);

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
