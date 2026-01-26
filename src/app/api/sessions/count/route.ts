import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { handleGetRequest } from '@/lib/services/api-handlers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId, req) => {
      const { searchParams } = new URL(req.url);
      const sessionType = searchParams.get('type');
      const search = searchParams.get('search');
      const dateFrom = searchParams.get('dateFrom');

      const whereClause: Prisma.training_sessionsWhereInput = { userId };

      if (sessionType && sessionType !== 'all') {
        whereClause.sessionType = sessionType;
      }

      if (dateFrom) {
        whereClause.date = {
          gte: new Date(dateFrom),
        };
      }

      if (search && search.trim()) {
        const searchTerm = search.trim();
        whereClause.OR = [
          { comments: { contains: searchTerm, mode: 'insensitive' } },
          { sessionType: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      const count = await prisma.training_sessions.count({
        where: whereClause,
      });

      return NextResponse.json({ count });
    },
    { logContext: 'get-sessions-count' }
  );
}
