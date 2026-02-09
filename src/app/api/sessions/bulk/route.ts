import { NextRequest, NextResponse } from 'next/server';
import { sessionSchema } from '@/lib/validation';
import { enrichBulkWeather } from '@/server/domain/sessions/enrichment';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { createCompletedSession, deleteSessions, logSessionWriteError, recalculateSessionNumbers } from '@/server/domain/sessions/sessions-write';

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
        let count = 0;
        const weatherQueue: Array<{ id: string; stravaData: unknown; date: string }> = [];

        for (const session of validatedSessions) {
          const { intervalDetails, stravaData, weather: importedWeather, averageTemp, ...sessionData } = session;
          const workout = await createCompletedSession(
            {
              ...sessionData,
              intervalDetails,
              stravaData,
              weather: importedWeather ?? null,
              averageTemp: averageTemp ?? null,
            },
            userId,
            { skipRecalculate: true }
          );
          count++;

          if (!importedWeather && stravaData) {
            weatherQueue.push({ id: workout.id, stravaData, date: session.date });
          }
        }

        await recalculateSessionNumbers(userId);

        const response = NextResponse.json(
          {
            message: `${count} séance${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''} avec succès`,
            count,
          },
          { status: HTTP_STATUS.CREATED }
        );

        if (weatherQueue.length > 0) {
          enrichBulkWeather(weatherQueue, userId).catch(() => {});
        }

        return response;
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
            message: `${ids.length} séance${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''} avec succès`,
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
