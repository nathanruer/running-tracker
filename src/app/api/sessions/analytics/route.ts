import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleGetRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { fetchSessions } from '@/server/domain/sessions/sessions-read';
import { computeAnalytics } from '@/lib/domain/analytics/compute-analytics';

export const runtime = 'nodejs';

const analyticsQuerySchema = z.object({
  dateRange: z.enum(['4weeks', '8weeks', '12weeks', 'all', 'custom']).default('4weeks'),
  granularity: z.enum(['day', 'week', 'month']).default('week'),
  customStartDate: z.string().default(''),
  customEndDate: z.string().default(''),
});

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const parsed = analyticsQuerySchema.safeParse(
        Object.fromEntries(request.nextUrl.searchParams)
      );

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Paramètres invalides' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const sessions = await fetchSessions({
        userId,
        view: 'table',
        includePlannedDateAsDate: true,
      });

      return NextResponse.json(computeAnalytics(sessions, parsed.data));
    },
    { logContext: 'sessions-analytics' }
  );
}
