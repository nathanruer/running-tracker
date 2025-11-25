import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActivities, refreshAccessToken } from '@/lib/strava';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

async function getValidAccessToken(user: any): Promise<string> {
  if (!user.stravaAccessToken || !user.stravaRefreshToken) {
    throw new Error('No Strava tokens found');
  }

  const now = new Date();
  const expiresAt = user.stravaTokenExpiresAt;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (!expiresAt || expiresAt < fiveMinutesFromNow) {
    const tokenData = await refreshAccessToken(user.stravaRefreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
      },
    });

    return tokenData.access_token;
  }

  return user.stravaAccessToken;
}

export async function GET(request: NextRequest) {
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

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if (!user.stravaId) {
      return NextResponse.json(
        { error: 'Compte Strava non connecté' },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(user);

    const activities = await getActivities(accessToken, 30);

    const runningActivities = activities.filter(
      (activity) => activity.type === 'Run'
    );

    return NextResponse.json({ activities: runningActivities });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch Strava activities');
    return NextResponse.json(
      { error: 'Impossible de récupérer les activités Strava' },
      { status: 500 }
    );
  }
}
