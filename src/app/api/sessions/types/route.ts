import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from '@/server/services/api-handlers';
import { fetchSessionTypes } from '@/server/domain/sessions/sessions-read';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const types = await fetchSessionTypes(userId);
      return NextResponse.json({ types });
    },
    { logContext: 'get-session-types' }
  );
}
