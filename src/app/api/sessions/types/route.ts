import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const types = await prisma.trainingSession.findMany({
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
}
