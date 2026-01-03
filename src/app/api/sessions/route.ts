import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { prisma } from '@/lib/database';
import { sessionSchema } from '@/lib/validation';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { handleGetRequest, handleApiRequest } from '@/lib/services/api-handlers';
import { getNextSessionNumber } from '@/lib/domain/sessions/utils';
import { HTTP_STATUS, SESSION_STATUS } from '@/lib/constants';

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

      const { intervalDetails, ...sessionData } = payload;
      
      let weather = null;
      if (sessionData.stravaData) {
        weather = await enrichSessionWithWeather(sessionData.stravaData, new Date(payload.date));
      }

      const session = await prisma.training_sessions.create({
        data: {
          ...sessionData,
          intervalDetails: intervalDetails || Prisma.JsonNull,
          weather: weather ?? Prisma.JsonNull,
          date: new Date(payload.date),
          sessionNumber: nextNumber,
          week: 1,
          userId,
          status: SESSION_STATUS.COMPLETED,
        },
      });

      await recalculateSessionNumbers(userId);

      const refreshedSession = await prisma.training_sessions.findUnique({
        where: { id: session.id },
      });

      return NextResponse.json(
        { session: refreshedSession || session },
        { status: HTTP_STATUS.CREATED }
      );
    },
    { logContext: 'create-session' }
  );
}

