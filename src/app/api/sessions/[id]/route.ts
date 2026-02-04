import { NextRequest, NextResponse } from 'next/server';
import { partialSessionSchema } from '@/lib/validation';
import { handleApiRequest, handleGetRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';
import { updateSession, deleteSession, logSessionWriteError } from '@/server/domain/sessions/sessions-write';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  return handleGetRequest(
    request,
    async (userId) => {
      const session = await fetchSessionById(userId, params.id);
      if (!session) {
        return NextResponse.json(
          { error: 'Séance introuvable' },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      return NextResponse.json({ session });
    },
    { logContext: 'get-session' }
  );
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  return handleApiRequest(
    request,
    partialSessionSchema,
    async (updates, userId) => {
      try {
        const updated = await updateSession(params.id, updates as Record<string, unknown>, userId);
        if (!updated) {
          return NextResponse.json(
            { error: 'Séance introuvable' },
            { status: HTTP_STATUS.NOT_FOUND }
          );
        }
        const session = await fetchSessionById(userId, params.id);
        return NextResponse.json({ session: session ?? updated });
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'update', id: params.id });
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la séance.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'update-session' }
  );
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      try {
        await deleteSession(params.id, userId);
        return NextResponse.json({ message: 'Séance supprimée' });
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'delete', id: params.id });
        return NextResponse.json(
          { error: 'Erreur lors de la suppression de la séance.' },
          { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    },
    { logContext: 'delete-session' }
  );
}
