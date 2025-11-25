import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/strava';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
