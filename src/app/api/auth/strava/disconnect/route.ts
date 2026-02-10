import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { handleApiRequest } from '@/server/services/api-handlers';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const account = await prisma.external_accounts.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: 'strava',
          },
        },
      });

      if (!account) {
        return NextResponse.json(
          { error: 'Aucun compte Strava n\'est actuellement lié' },
          { status: 400 }
        );
      }

      await prisma.external_accounts.deleteMany({
        where: {
          userId,
          provider: 'strava',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Compte Strava déconnecté avec succès'
      });
    },
    { logContext: 'disconnect-strava' }
  );
}
