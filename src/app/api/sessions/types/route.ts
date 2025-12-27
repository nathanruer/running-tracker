import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { handleGetRequest } from '@/lib/services/api-handlers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const types = await prisma.training_sessions.findMany({
        where: { userId },
        distinct: ['sessionType'],
        select: {
          sessionType: true,
        },
        orderBy: {
          sessionType: 'asc',
        },
      });

      return NextResponse.json({ types: types.map((t) => t.sessionType) });
    },
    { logContext: 'get-session-types' }
  );
}
