import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getActivities, refreshAccessToken } from '@/lib/services/strava';
import { handleGetRequest } from '@/lib/services/api-handlers';

async function getValidAccessToken(user: { id: string; stravaAccessToken: string | null; stravaRefreshToken: string | null; stravaTokenExpiresAt: Date | null }): Promise<string> {
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
  return handleGetRequest(
    request,
    async (userId) => {
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
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const perPage = parseInt(searchParams.get('per_page') || '50');

      const activities = await getActivities(accessToken, perPage, page);
      const hasMore = activities.length === perPage;

      const runningActivities = activities.filter(
        (activity) => activity.type === 'Run'
      );

      return NextResponse.json({ 
        activities: runningActivities,
        hasMore 
      });
    },
    { logContext: 'get-strava-activities' }
  );
}
