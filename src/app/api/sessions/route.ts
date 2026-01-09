import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { prisma } from '@/lib/database';
import { sessionSchema } from '@/lib/validation';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { handleGetRequest, handleApiRequest } from '@/lib/services/api-handlers';
import { getNextSessionNumber } from '@/lib/domain/sessions/utils';
import { HTTP_STATUS, SESSION_STATUS } from '@/lib/constants';
import { fetchStreamsForSession } from '@/lib/services/strava';

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

      const whereClause: Prisma.training_sessionsWhereInput = { userId };

      if (status && status !== 'all') {
        whereClause.status = status;
      }

      if (sessionType && sessionType !== 'all') {
        whereClause.sessionType = sessionType;
      }

      const sessions = await prisma.training_sessions.findMany({
        where: whereClause,
        orderBy: [
          { status: 'desc' },
          { sessionNumber: 'desc' },
        ],
        ...(limit > 0 ? { take: limit } : {}),
        ...(offset > 0 ? { skip: offset } : {}),
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
      const nextNumber = await getNextSessionNumber(userId);

      const { intervalDetails, stravaData, ...sessionData } = payload;

      let weather = null;
      if (stravaData) {
        weather = await enrichSessionWithWeather(stravaData, new Date(payload.date));
      }

      const stravaStreams = await fetchStreamsForSession(
        sessionData.source ?? null,
        sessionData.externalId ?? null,
        userId,
        'session-import'
      );

      const session = await prisma.training_sessions.create({
        data: {
          ...sessionData,
          intervalDetails: intervalDetails || Prisma.JsonNull,
          stravaData: stravaData || Prisma.JsonNull,
          weather: weather ?? Prisma.JsonNull,
          stravaStreams: stravaStreams ? (stravaStreams as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          date: new Date(payload.date),
          sessionNumber: nextNumber,
          week: 1,
          userId,
          status: SESSION_STATUS.COMPLETED,
        },
      });

      await recalculateSessionNumbers(userId, new Date(payload.date));

      return NextResponse.json(
        { session },
        { status: HTTP_STATUS.CREATED }
      );
    },
    { logContext: 'create-session' }
  );
}

