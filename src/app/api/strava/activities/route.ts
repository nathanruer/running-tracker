import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getActivities, refreshAccessToken } from '@/lib/services/strava';
import { getUserIdFromRequest } from '@/lib/auth';
import { logger } from '@/lib/infrastructure/logger';

async function getValidAccessToken(user: any): Promise<string> {
  if (!user.stravaAccessToken || !user.stravaRefreshToken) {
    throw new Error('No Strava tokens found');
  }

  const now = new Date();
  const expiresAt = user.stravaTokenExpiresAt;
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (!expiresAt || expiresAt < fiveMinutesFromNow) {
    const tokenData = await refreshAccessToken(user.stravaRefreshToken);

    await prisma.users.update({
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
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

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
