import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { findSessionByIdAndUser } from '@/lib/utils/api-helpers';
import { handleApiRequest } from '@/lib/services/api-handlers';
import { HTTP_STATUS, SESSION_STATUS } from '@/lib/constants';
import { fetchStreamsForSession } from '@/lib/services/strava';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const session = await findSessionByIdAndUser(id, userId);

      if (!session) {
        return NextResponse.json(
          { error: 'Séance non trouvée' },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      if (session.status !== SESSION_STATUS.PLANNED) {
        return NextResponse.json(
          { error: 'Cette séance n\'est pas planifiée' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const body = await request.json();
      const {
        date,
        duration,
        distance,
        avgPace,
        avgHeartRate,
        perceivedExertion,
        comments,
        externalId,
        source,
        stravaData,
        elevationGain,
        averageCadence,
        averageTemp,
        calories,
      } = body;

      let weather = null;
      if (stravaData) {
        weather = await enrichSessionWithWeather(stravaData, new Date(date));
      }

      const stravaStreams = await fetchStreamsForSession(
        source ?? null,
        externalId ?? null,
        userId,
        'session-completion'
      );

      const completedSession = await prisma.training_sessions.update({
        where: { id },
        data: {
          status: SESSION_STATUS.COMPLETED,
          date: new Date(date),
          duration,
          distance: parseFloat(distance),
          avgPace,
          avgHeartRate: parseInt(avgHeartRate, 10) || 0,
          perceivedExertion: perceivedExertion ? parseInt(perceivedExertion, 10) : 0,
          comments: comments || '',
          externalId: externalId ?? undefined,
          source: source ?? undefined,
          stravaData: stravaData ?? undefined,
          stravaStreams: stravaStreams ? (stravaStreams as unknown as Prisma.InputJsonValue) : undefined,
          elevationGain: elevationGain ?? undefined,
          averageCadence: averageCadence ?? undefined,
          averageTemp: averageTemp ?? undefined,
          calories: calories ?? undefined,
          weather: weather ?? undefined,
        },
      });

      await recalculateSessionNumbers(userId);

      const refreshed = await prisma.training_sessions.findUnique({
        where: { id }
      });

      return NextResponse.json(refreshed || completedSession);
    },
    { logContext: 'complete-planned-session' }
  );
}
