import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from '@/server/services/api-handlers';
import { fetchSessionCount } from '@/server/domain/sessions/sessions-read';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId, req) => {
      const { searchParams } = new URL(req.url);
      const sessionType = searchParams.get('type');
      const search = searchParams.get('search');
      const dateFrom = searchParams.get('dateFrom');

      const count = await fetchSessionCount({
        userId,
        status: null,
        sessionType,
        search,
        dateFrom,
      });

      return NextResponse.json({ count });
    },
    { logContext: 'get-sessions-count' }
  );
}
