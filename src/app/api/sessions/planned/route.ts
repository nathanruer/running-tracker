import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest } from '@/server/services/api-handlers';
import { partialSessionSchema } from '@/lib/validation';
import { createPlannedSession, logSessionWriteError } from '@/server/domain/sessions/sessions-write';
import { fetchSessionById } from '@/server/domain/sessions/sessions-read';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    partialSessionSchema,
    async (payload, userId) => {
      try {
        const plan = await createPlannedSession(payload, userId);

        const session = await fetchSessionById(userId, plan.id);
        return NextResponse.json({ session });
      } catch (error) {
        await logSessionWriteError(error, { userId, action: 'create-planned' });
        return NextResponse.json(
          { error: 'Erreur lors de la création de la séance planifiée.' },
          { status: 500 }
        );
      }
    },
    { logContext: 'create-planned-session' }
  );
}
