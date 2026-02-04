import { NextRequest, NextResponse } from 'next/server';
import { enrichSessionWithWeather } from '@/server/domain/sessions/enrichment';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { updateSessionWeather, logSessionWriteError } from '@/server/domain/sessions/sessions-write';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';

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
      const body = await request.json();
      const providedWeather = body?.weather ?? null;
      const session = await fetchSessionById(userId, id);

      if (!session) {
        return NextResponse.json(
          { error: 'Séance non trouvée' },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      if (providedWeather) {
        try {
          const workoutId = await updateSessionWeather(id, userId, providedWeather);
          if (!workoutId) {
            return NextResponse.json(
              { error: 'Séance non trouvée' },
              { status: HTTP_STATUS.NOT_FOUND }
            );
          }
          const updated = await fetchSessionById(userId, id);
          return NextResponse.json(updated ?? { id: workoutId, weather: providedWeather });
        } catch (error) {
          await logSessionWriteError(error, { userId, action: 'weather', id });
          return NextResponse.json(
            { error: 'Erreur lors de la mise à jour météo.' },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
          );
        }
      }

      if (session.weather) {
        return NextResponse.json(
          { message: 'Cette séance a déjà des données météo', weather: session.weather },
          { status: HTTP_STATUS.OK }
        );
      }

      if (!session.stravaData) {
        return NextResponse.json(
          { error: 'Cette séance n\'a pas de données Strava pour l\'enrichissement' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

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

      try {
        const workoutId = await updateSessionWeather(id, userId, weather);
        if (!workoutId) {
          return NextResponse.json(
            { error: 'Séance non trouvée' },
            { status: HTTP_STATUS.NOT_FOUND }
          );
        }
        const updated = await fetchSessionById(userId, id);
        return NextResponse.json(updated ?? { id: workoutId, weather });
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'weather', id });
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour météo.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'enrich-session-weather' }
  );
}
