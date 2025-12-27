import { NextRequest, NextResponse } from 'next/server';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { handleApiRequest } from '@/lib/services/api-handlers';

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
