import { NextRequest, NextResponse } from 'next/server';
import { sessionSchema } from '@/lib/validation';
import { enrichSessionWithWeather } from '@/server/domain/sessions/enrichment';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { createCompletedSession, deleteSessions, logSessionWriteError } from '@/server/domain/sessions/sessions-write';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const { sessions } = await request.json();

      if (!Array.isArray(sessions) || sessions.length === 0) {
        return NextResponse.json(
          { error: 'Le tableau de séances est requis' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const validatedSessions = sessions.map((session) =>
        sessionSchema.parse(session)
      );

      try {
        const created = [];
        for (const session of validatedSessions) {
          const { intervalDetails, stravaData, weather: importedWeather, averageTemp, ...sessionData } = session;
          let weather = importedWeather || null;
          if (!weather && stravaData) {
            weather = await enrichSessionWithWeather(stravaData, new Date(session.date));
          }
          const workout = await createCompletedSession(
            {
              ...sessionData,
              intervalDetails,
              stravaData,
              weather: weather ?? null,
              averageTemp: averageTemp ?? null,
            },
            userId
          );
          const createdSession = await fetchSessionById(userId, workout.id);
          if (createdSession) created.push(createdSession);
        }

        return NextResponse.json(
          {
            message: `${created.length} séance(s) importée(s) avec succès`,
            count: created.length,
          },
          { status: HTTP_STATUS.CREATED }
        );
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'bulk-import' });
        return NextResponse.json(
          { error: 'Erreur lors de l\'import des séances.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'bulk-import-sessions' }
  );
}

export async function DELETE(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const { ids } = await request.json();

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: 'Le tableau d\'identifiants est requis' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      try {
        await deleteSessions(ids, userId);
        return NextResponse.json(
          {
            message: `${ids.length} séance(s) supprimée(s) avec succès`,
            count: ids.length,
          },
          { status: HTTP_STATUS.OK }
        );
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'bulk-delete' });
        return NextResponse.json(
          { error: 'Erreur lors de la suppression des séances.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'bulk-delete-sessions' }
  );
}
