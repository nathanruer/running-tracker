import { NextRequest, NextResponse } from 'next/server';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';
import { handleApiRequest } from '@/server/services/api-handlers';
import { completeSessionSchema } from '@/lib/validation';
import { HTTP_STATUS } from '@/lib/constants';
import { fetchStreamsForSessionWithStatus } from '@/server/services/strava';
import { enrichSessionWithWeather } from '@/server/domain/sessions/enrichment';
import { completePlannedSession, logSessionWriteError } from '@/server/domain/sessions/sessions-write';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRequest(
    request,
    completeSessionSchema,
    async (body, userId) => {
      try {
        const streamResult = await fetchStreamsForSessionWithStatus(
          body.source ?? null,
          body.externalId ?? null,
          userId,
          'session-completion'
        );

        if (body.stravaData && streamResult.polyline && !body.stravaData.map) {
          body.stravaData.map = {
            id: `${body.source}_${body.externalId}`,
            summary_polyline: streamResult.polyline,
          };
        }

        let weather = body.weather ?? null;
        if (!weather && body.stravaData) {
          weather = await enrichSessionWithWeather(body.stravaData, new Date(body.date));
        }

        const workout = await completePlannedSession(
          id,
          {
            ...body,
            stravaStreams: streamResult.streams ?? body.stravaStreams ?? null,
            weather,
          },
          userId
        );

        if (!workout) {
          return NextResponse.json(
            { error: 'Séance non trouvée' },
            { status: HTTP_STATUS.NOT_FOUND }
          );
        }

        const session = await fetchSessionById(userId, workout.id);
        return NextResponse.json(session || workout);
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'complete-planned', id });
        return NextResponse.json(
          { error: 'Erreur lors de la complétion de la séance.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'complete-planned-session' }
  );
}
