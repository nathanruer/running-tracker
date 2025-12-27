import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { refreshAccessToken } from '@/lib/services/strava';
import { handleApiRequest } from '@/lib/services/api-handlers';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user || !user.stravaRefreshToken) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé ou non connecté à Strava' },
          { status: 404 }
        );
      }

      const tokenData = await refreshAccessToken(user.stravaRefreshToken);

      await prisma.users.update({
        where: { id: user.id },
        data: {
          stravaAccessToken: tokenData.access_token,
          stravaRefreshToken: tokenData.refresh_token,
          stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
        },
      });

      return NextResponse.json({
        success: true,
        expiresAt: tokenData.expires_at,
      });
    },
    { logContext: 'refresh-strava-token' }
  );
}
