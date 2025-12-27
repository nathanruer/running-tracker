import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { handleApiRequest } from '@/lib/services/api-handlers';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé' },
          { status: 404 }
        );
      }

      if (!user.stravaId) {
        return NextResponse.json(
          { error: 'Aucun compte Strava n\'est actuellement lié' },
          { status: 400 }
        );
      }

      await prisma.users.update({
        where: { id: userId },
        data: {
          stravaId: null,
          stravaAccessToken: null,
          stravaRefreshToken: null,
          stravaTokenExpiresAt: null,
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Compte Strava déconnecté avec succès'
      });
    },
    { logContext: 'disconnect-strava' }
  );
}