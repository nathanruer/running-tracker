import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { sessionSchema } from '@/lib/validation';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { handleApiRequest } from '@/lib/services/api-handlers';
import { HTTP_STATUS, SESSION_STATUS } from '@/lib/constants';

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

      // Fetch weather for each session in parallel
      const sessionsWithWeather = await Promise.all(
        validatedSessions.map(async (session) => {
          const { intervalDetails, stravaData, ...sessionData } = session;

          let weather = null;
          if (stravaData) {
            weather = await enrichSessionWithWeather(stravaData, new Date(session.date));
          }

          return {
            ...sessionData,
            intervalDetails: intervalDetails || Prisma.JsonNull,
            stravaData: stravaData || Prisma.JsonNull,
            weather: weather ?? Prisma.JsonNull,
            date: new Date(session.date),
            sessionNumber: 1,
            week: 1,
            userId,
            status: SESSION_STATUS.COMPLETED,
          };
        })
      );
      
      const result = await prisma.training_sessions.createMany({
        data: sessionsWithWeather,
      });

      await recalculateSessionNumbers(userId);

      return NextResponse.json(
        {
          message: `${result.count} séance(s) importée(s) avec succès`,
          count: result.count,
        },
        { status: HTTP_STATUS.CREATED }
      );
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

      const result = await prisma.training_sessions.deleteMany({
        where: {
          id: { in: ids },
          userId: userId,
        },
      });

      await recalculateSessionNumbers(userId);

      return NextResponse.json(
        {
          message: `${result.count} séance(s) supprimée(s) avec succès`,
          count: result.count,
        },
        { status: HTTP_STATUS.OK }
      );
    },
    { logContext: 'bulk-delete-sessions' }
  );
}
