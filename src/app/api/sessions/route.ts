import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { prisma } from '@/lib/database';
import { sessionSchema } from '@/lib/validation';
import { calculateSessionPosition } from '@/lib/domain/sessions/position';
import { parseSortParam, buildPrismaOrderBy } from '@/lib/domain/sessions';
import { handleGetRequest, handleApiRequest } from '@/lib/services/api-handlers';
import { HTTP_STATUS, SESSION_STATUS } from '@/lib/constants';
import { fetchStreamsForSession } from '@/lib/services/strava';
import { toPrismaJson } from '@/lib/utils/api';

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

      const whereClause: Prisma.training_sessionsWhereInput = { userId };

      if (status && status !== 'all') {
        whereClause.status = status;
      }

      if (sessionType && sessionType !== 'all') {
        whereClause.sessionType = sessionType;
      }

      if (dateFrom) {
        whereClause.date = {
          gte: new Date(dateFrom),
        };
      }

      if (search && search.trim()) {
        const searchTerm = search.trim();
        whereClause.OR = [
          { comments: { contains: searchTerm, mode: 'insensitive' } },
          { sessionType: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      const sortConfig = parseSortParam(sortParam);
      const orderBy = buildPrismaOrderBy(sortConfig);

      const sessions = await prisma.training_sessions.findMany({
        where: whereClause,
        orderBy,
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
      const sessionDate = new Date(payload.date);

      const { sessionNumber, week } = await calculateSessionPosition(userId, sessionDate);

      const { intervalDetails, stravaData, ...sessionData } = payload;

      let weather = null;
      if (stravaData) {
        weather = await enrichSessionWithWeather(stravaData, sessionDate);
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
          stravaStreams: stravaStreams ? toPrismaJson(stravaStreams) : Prisma.JsonNull,
          date: sessionDate,
          sessionNumber,
          week,
          userId,
          status: SESSION_STATUS.COMPLETED,
        },
      });

      return NextResponse.json(
        { session },
        { status: HTTP_STATUS.CREATED }
      );
    },
    { logContext: 'create-session' }
  );
}

