import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/strava';
import { getUserIdFromRequest } from '@/lib/auth';
import { logger } from '@/lib/logger';



export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stravaRefreshToken) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé ou non connecté à Strava' },
        { status: 404 }
      );
    }

    const tokenData = await refreshAccessToken(user.stravaRefreshToken);

    await prisma.user.update({
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
  } catch (error) {
    logger.error({ error }, 'Token refresh failed');
    return NextResponse.json(
      { error: 'Échec du rafraîchissement du token' },
      { status: 500 }
    );
  }
}
