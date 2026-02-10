import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { refreshAccessToken } from '@/server/services/strava';
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

      if (!account?.refreshToken) {
        return NextResponse.json(
          { error: 'Utilisateur non trouvé ou non connecté à Strava' },
          { status: 404 }
        );
      }

      const tokenData = await refreshAccessToken(account.refreshToken);

      await prisma.external_accounts.update({
        where: {
          userId_provider: {
            userId,
            provider: 'strava',
          },
        },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt: new Date(tokenData.expires_at * 1000),
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
