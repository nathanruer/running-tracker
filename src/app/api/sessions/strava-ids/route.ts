import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from '@/server/services/api-handlers';
import { getImportedExternalIds } from '@/server/domain/sessions/sessions-read';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const ids = await getImportedExternalIds(userId, 'strava');
      return NextResponse.json(Array.from(ids));
    },
    { logContext: 'get-strava-ids' }
  );
}
