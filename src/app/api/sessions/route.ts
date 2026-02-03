import { NextRequest, NextResponse } from 'next/server';
import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { sessionSchema } from '@/lib/validation';
import { handleGetRequest, handleApiRequest } from '@/lib/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { fetchStreamsForSession } from '@/lib/services/strava';
import { toPrismaJson } from '@/lib/utils/api';
import { fetchSessions } from '@/lib/domain/sessions/sessions-read';
import { createCompletedSession, logSessionWriteError } from '@/lib/domain/sessions/sessions-write';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId, req) => {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') ?? '0');
      const offset = parseInt(searchParams.get('offset') ?? '0');
      const sessionType = searchParams.get('type');
      const status = searchParams.get('status');
      const sortParam = searchParams.get('sort');
      const search = searchParams.get('search');
      const dateFrom = searchParams.get('dateFrom');
      const context = searchParams.get('context');

      const sessions = await fetchSessions({
        userId,
        limit,
        offset,
        status,
        sessionType,
        search,
        dateFrom,
        sort: sortParam,
        includePlannedDateAsDate: context === 'analytics',
      });

      return NextResponse.json({ sessions });
    },
    { logContext: 'get-sessions' }
  );
}

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    sessionSchema,
    async (payload, userId) => {
      try {
        const sessionDate = new Date(payload.date);
        let weather = null;
        if (payload.stravaData) {
          weather = await enrichSessionWithWeather(payload.stravaData, sessionDate);
        }

        const stravaStreams = await fetchStreamsForSession(
          payload.source ?? null,
          payload.externalId ?? null,
          userId,
          'session-import'
        );

        const workout = await createCompletedSession(
          {
            ...payload,
            weather: weather ?? null,
            stravaStreams: stravaStreams ? toPrismaJson(stravaStreams) : null,
          },
          userId
        );

        const { fetchSessionById } = await import('@/lib/domain/sessions/sessions-read');
        const session = await fetchSessionById(userId, workout.id);

        return NextResponse.json(
          { session },
          { status: HTTP_STATUS.CREATED }
        );
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'create-completed' });
        return NextResponse.json(
          { error: 'Erreur lors de la création de la séance.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'create-session' }
  );
}
