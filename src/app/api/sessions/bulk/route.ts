import { NextRequest, NextResponse, after } from 'next/server';
import { runAsUser } from '@/server/database/tenant';
import { bulkDeleteSchema, bulkImportSchema } from '@/lib/validation';
import { enrichBulkWeather } from '@/server/domain/sessions/enrichment';
import { bulkEnrichStreamsForIds } from '@/server/domain/sessions/streams-bulk';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { createCompletedSession, deleteSessions, DuplicateExternalActivityError, logSessionWriteError, recalculateSessionNumbers } from '@/server/domain/sessions/sessions-write';
import { getImportedExternalIds } from '@/server/domain/sessions/sessions-read';
import { logger } from '@/server/infrastructure/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    bulkImportSchema,
    async ({ sessions: validatedSessions }, userId) => {
      try {
        const importedIds = await getImportedExternalIds(userId, 'intervals_icu');
        let count = 0;
        let skipped = 0;
        const weatherQueue: Array<{ id: string; routePolyline: string; startedAt: string }> = [];
        const streamQueueIds: string[] = [];

        for (const session of validatedSessions) {
          if (session.externalId && importedIds.has(session.externalId)) {
            skipped++;
            continue;
          }

          const { intervalDetails, weather: importedWeather, averageTemp, ...sessionData } = session;
          let workout;
          try {
            workout = await createCompletedSession(
              {
                ...sessionData,
                intervalDetails,
                weather: importedWeather ?? null,
                averageTemp: averageTemp ?? null,
              },
              userId,
              { skipRecalculate: true }
            );
          } catch (error) {
            if (error instanceof DuplicateExternalActivityError) {
              skipped++;
              continue;
            }
            throw error;
          }
          count++;

          if (session.externalId) {
            importedIds.add(session.externalId);
          }

          if (!importedWeather && session.routePolyline) {
            weatherQueue.push({ id: workout.id, routePolyline: session.routePolyline, startedAt: session.startedAt ?? session.date });
          }

          if (session.source === 'intervals_icu' && session.externalId) {
            streamQueueIds.push(workout.id);
          }
        }

        await recalculateSessionNumbers(userId);

        const message = skipped > 0
          ? `${count} séance${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''} avec succès (${skipped} déjà importée${skipped > 1 ? 's' : ''})`
          : `${count} séance${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''} avec succès`;

        if (streamQueueIds.length > 0 || weatherQueue.length > 0) {
          after(() => runAsUser(userId, async () => {
            if (streamQueueIds.length > 0) {
              try {
                await bulkEnrichStreamsForIds(userId, streamQueueIds, { concurrency: 2 });
              } catch (error) {
                logger.warn({ error, userId }, 'Failed to enrich bulk streams');
              }
            }
            if (weatherQueue.length > 0) {
              try {
                await enrichBulkWeather(weatherQueue, userId, { concurrency: 3 });
              } catch (error) {
                logger.warn({ error, userId }, 'Failed to enrich bulk weather');
              }
            }
          }));
        }

        return NextResponse.json(
          { message, count, skipped },
          { status: HTTP_STATUS.CREATED }
        );
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'bulk-import' });
        return NextResponse.json(
          { error: 'Erreur lors de l\'import des séances.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'bulk-import-sessions' }
  );
}

export async function DELETE(request: NextRequest) {
  return handleApiRequest(
    request,
    bulkDeleteSchema,
    async ({ ids }, userId) => {
      try {
        await deleteSessions(ids, userId);
        return NextResponse.json(
          {
            message: `${ids.length} séance${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''} avec succès`,
            count: ids.length,
          },
          { status: HTTP_STATUS.OK }
        );
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'bulk-delete' });
        return NextResponse.json(
          { error: 'Erreur lors de la suppression des séances.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'bulk-delete-sessions' }
  );
}
