import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { enrichSessionWithWeather } from '@/lib/domain/sessions/enrichment';
import { findSessionByIdAndUser } from '@/lib/utils/api';
import { handleApiRequest } from '@/lib/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * Endpoint to re-enrich a session with weather data
 * Useful for sessions created without weather that can be enriched later
 */
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

      // Check if session already has weather data
      if (session.weather) {
        return NextResponse.json(
          { message: 'Cette séance a déjà des données météo', weather: session.weather },
          { status: HTTP_STATUS.OK }
        );
      }

      // Check if session has Strava data to enrich from
      if (!session.stravaData) {
        return NextResponse.json(
          { error: 'Cette séance n\'a pas de données Strava pour l\'enrichissement' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      // Check if session has a date
      if (!session.date) {
        return NextResponse.json(
          { error: 'Cette séance n\'a pas de date' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const weather = await enrichSessionWithWeather(
        session.stravaData,
        new Date(session.date)
      );

      if (!weather) {
        return NextResponse.json(
          { error: 'Impossible de récupérer les données météo pour cette séance' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }

      const updatedSession = await prisma.training_sessions.update({
        where: { id },
        data: { weather },
      });

      return NextResponse.json(updatedSession);
    },
    { logContext: 'enrich-session-weather' }
  );
}
