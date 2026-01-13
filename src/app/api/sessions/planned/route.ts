import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { Prisma } from '@prisma/client';
import { handleApiRequest } from '@/lib/services/api-handlers';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const body = await request.json();
      const {
        sessionType,
        targetDuration,
        targetDistance,
        targetPace,
        targetHeartRateBpm,
        targetRPE,
        intervalDetails,
        plannedDate,
        recommendationId,
        comments,
      } = body;

      const [sessionStats, firstSession] = await Promise.all([
        prisma.training_sessions.aggregate({
          where: { userId },
          _max: { sessionNumber: true },
        }),
        plannedDate
          ? prisma.training_sessions.findFirst({
              where: { userId, date: { not: null } },
              orderBy: { date: 'asc' },
              select: { date: true },
            })
          : null,
      ]);

      const nextSessionNumber = (sessionStats._max.sessionNumber ?? 0) + 1;

      let week: number | null = null;
      if (plannedDate && firstSession?.date) {
        const baseDate = new Date(plannedDate);
        const diffTime = Math.abs(baseDate.getTime() - firstSession.date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        week = Math.floor(diffDays / 7) + 1;
      } else if (plannedDate) {
        week = 1;
      }

      const plannedSession = await prisma.training_sessions.create({
        data: {
          userId,
          sessionNumber: nextSessionNumber,
          week,
          sessionType,
          status: 'planned',
          targetDuration,
          targetDistance,
          targetPace,

          targetHeartRateBpm: targetHeartRateBpm?.toString(),
          targetRPE,
          intervalDetails: intervalDetails || Prisma.JsonNull,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
          recommendationId,
          comments: comments || '',
        },
      });

      return NextResponse.json(plannedSession);
    },
    { logContext: 'create-planned-session' }
  );
}
