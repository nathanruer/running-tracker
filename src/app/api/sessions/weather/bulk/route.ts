import { NextRequest, NextResponse } from 'next/server';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { bulkEnrichWeatherForIds } from '@/server/domain/sessions/weather-bulk';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const body = await request.json();
      const ids = body?.ids ?? null;

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: "Le tableau d'identifiants est requis" },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const result = await bulkEnrichWeatherForIds(userId, ids);
      return NextResponse.json(result, { status: HTTP_STATUS.OK });
    },
    { logContext: 'bulk-enrich-weather' }
  );
}
