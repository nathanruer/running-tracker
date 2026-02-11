import { NextRequest, NextResponse } from 'next/server';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { fetchStreamsForSession } from '@/server/services/strava';
import { enrichSessionWithWeather } from '@/server/domain/sessions/enrichment';
import { completePlannedSession, logSessionWriteError } from '@/server/domain/sessions/sessions-write';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const body = await request.json();
      if (!body?.date || isNaN(new Date(body.date).getTime())) {
        return NextResponse.json(
          { error: 'Une date valide est requise pour terminer une séance' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      try {
        let weather = body.weather ?? null;
        if (!weather && body.stravaData) {
          weather = await enrichSessionWithWeather(body.stravaData, new Date(body.date));
        }
        const stravaStreams = await fetchStreamsForSession(
          body.source ?? null,
          body.externalId ?? null,
          userId,
          'session-completion'
        );

        const workout = await completePlannedSession(
          id,
          {
            ...body,
            stravaStreams: stravaStreams ? body.stravaStreams ?? stravaStreams : body.stravaStreams,
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
