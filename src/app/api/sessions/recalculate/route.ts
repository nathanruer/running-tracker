import { NextRequest, NextResponse } from 'next/server';
import { recalculateSessionNumbers } from '@/server/domain/sessions/sessions-write';
import { handleApiRequest } from '@/server/services/api-handlers';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      await recalculateSessionNumbers(userId);

      return NextResponse.json({
        message: 'Les semaines ont été recalculées avec succès pour toutes vos séances',
      });
    },
    { logContext: 'recalculate-sessions' }
  );
}
