import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';
import {
  updateSessionStreams,
  markSessionNoStreams,
  logSessionWriteError,
} from '@/server/domain/sessions/sessions-write';

export const runtime = 'nodejs';
// The provider round-trips (intervals.icu, Open-Meteo, the coach) outlive the default budget.
export const maxDuration = 60;
import { fetchStreamsForSessionWithStatus } from '@/server/services/intervals';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const session = await fetchSessionById(userId, id);

      if (!session) {
        return NextResponse.json(
          { error: 'Séance non trouvée' },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      if (session.streams) {
        return NextResponse.json(
          {
            status: 'already_has_streams',
            message: 'Cette séance a déjà ses streams',
            session,
          },
          { status: HTTP_STATUS.OK }
        );
      }

      if (session.hasStreams === true) {
        return NextResponse.json(
          {
            status: 'no_streams',
            message: 'Aucun stream exploitable pour cette activité',
            session,
          },
          { status: HTTP_STATUS.OK }
        );
      }

      if (!session.source || !session.externalId) {
        return NextResponse.json(
          {
            error: "Cette séance n'est liée à aucune activité externe",
            status: 'missing_source',
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const streamResult = await fetchStreamsForSessionWithStatus(
        session.source,
        session.externalId,
        userId,
        'enrich-session-streams'
      );

      if (streamResult.status === 'no_streams') {
        await markSessionNoStreams(id, userId);
        const updated = await fetchSessionById(userId, id);
        return NextResponse.json(
          {
            status: 'no_streams',
            message: 'Aucun stream exploitable pour cette activité',
            session: updated ?? session,
          },
          { status: HTTP_STATUS.OK }
        );
      }

      if (streamResult.status !== 'ok' || !streamResult.streams) {
        return NextResponse.json(
          {
            error: 'Impossible de récupérer les streams de cette séance',
            status: 'failed',
          },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }

      try {
        const workoutId = await updateSessionStreams(
          id,
          userId,
          streamResult.streams as Record<string, unknown>
        );

        if (!workoutId) {
          return NextResponse.json(
            { error: 'Séance non trouvée', status: 'not_found' },
            { status: HTTP_STATUS.NOT_FOUND }
          );
        }

        const updated = await fetchSessionById(userId, id);
        return NextResponse.json({
          status: 'enriched',
          session: updated ?? { id: workoutId, streams: streamResult.streams },
        });
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'streams', id });
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour des streams.', status: 'failed' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'enrich-session-streams' }
  );
}
