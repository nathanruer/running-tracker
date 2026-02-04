import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { getActivities, formatStravaActivity, getValidAccessToken, getAthleteStats } from '@/server/services/strava';
import { handleGetRequest } from '@/server/services/api-handlers';
import { StravaActivity } from '@/lib/types/strava';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
      }

      if (!user.stravaId) {
        return NextResponse.json({ error: 'Compte Strava non connecté' }, { status: 400 });
      }

      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const perPage = parseInt(searchParams.get('per_page') || '20');

      const accessToken = await getValidAccessToken(user);
      
      const [activities, stats] = await Promise.all([
        getActivities(accessToken, perPage, page),
        getAthleteStats(accessToken, user.stravaId)
      ]);

      const runs = activities.filter((a: StravaActivity) => a.type === 'Run');
      const formatted = runs.map(formatStravaActivity);

      return NextResponse.json({
        activities: formatted,
        hasMore: activities.length === perPage,
        totalCount: stats.all_run_totals.count,
      });
    },
    { logContext: 'get-strava-activities' }
  );
}
