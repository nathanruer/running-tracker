import { NextRequest, NextResponse } from 'next/server';
import { enrichSessionWithWeather } from '@/server/domain/sessions/enrichment';
import { sessionSchema } from '@/lib/validation';
import { handleGetRequest, handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import {
  fetchStreamsForSessionWithStatus,
  fetchMergedStreamsForActivities,
} from '@/server/services/intervals';
import { toPrismaJson } from '@/server/utils/prisma-json';
import { fetchSessions } from '@/server/domain/sessions/sessions-read';
import { createCompletedSession, logSessionWriteError } from '@/server/domain/sessions/sessions-write';

export const runtime = 'nodejs';
// The provider round-trips (intervals.icu, Open-Meteo, the coach) outlive the default budget.
export const maxDuration = 60;


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
      const viewParam = searchParams.get('view');
      const fieldsParam = searchParams.get('fields');
      const view =
        viewParam === 'table' || fieldsParam === 'summary'
          ? 'table'
          : viewParam === 'export'
            ? 'export'
            : undefined;

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
        view,
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
        // Merged recordings: the series of every piece are glued back together.
        const mergedIds = (payload.sources ?? []).map((source) => source.externalId);
        const streamResult = mergedIds.length > 1
          ? await fetchMergedStreamsForActivities(mergedIds, userId, 'session-import')
          : await fetchStreamsForSessionWithStatus(
              payload.source ?? null,
              payload.externalId ?? null,
              userId,
              'session-import'
            );
        const routePolyline = payload.routePolyline ?? streamResult.polyline ?? null;
        const weather = routePolyline
          ? await enrichSessionWithWeather({ routePolyline, startedAt: payload.startedAt ?? payload.date })
          : null;

        const workout = await createCompletedSession(
          {
            ...payload,
            routePolyline,
            weather: weather ?? null,
            streams: streamResult.streams ? toPrismaJson(streamResult.streams) : null,
          },
          userId
        );

        const { fetchSessionById } = await import('@/server/domain/sessions/sessions-read');
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
