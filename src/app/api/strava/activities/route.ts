import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database';
import { getActivities, formatStravaActivity, getValidAccessToken, getAthleteStats } from '@/server/services/strava';
import { handleGetRequest } from '@/server/services/api-handlers';
import type { StravaActivity } from '@/lib/types/strava';

const STRAVA_FETCH_SIZE = 50;
const MAX_STRAVA_CALLS = 5;

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          externalAccounts: {
            where: { provider: 'strava' },
            select: {
              externalId: true,
              accessToken: true,
              refreshToken: true,
              tokenExpiresAt: true,
            },
            take: 1,
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
      }

      const stravaAccount = user.externalAccounts[0] ?? null;
      if (!stravaAccount?.externalId) {
        return NextResponse.json({ error: 'Compte Strava non connecté' }, { status: 400 });
      }

      const { searchParams } = new URL(request.url);
      const perPage = parseInt(searchParams.get('per_page') || '30');
      const before = searchParams.get('before') ? parseInt(searchParams.get('before')!) : undefined;

      const accessToken = await getValidAccessToken({
        userId: user.id,
        accessToken: stravaAccount.accessToken ?? null,
        refreshToken: stravaAccount.refreshToken ?? null,
        tokenExpiresAt: stravaAccount.tokenExpiresAt ?? null,
      });

      const statsPromise = getAthleteStats(accessToken, stravaAccount.externalId);

      const runs: StravaActivity[] = [];
      let currentBefore = before;
      let stravaHasMore = true;
      let calls = 0;

      while (runs.length < perPage && stravaHasMore && calls < MAX_STRAVA_CALLS) {
        const activities = await getActivities(accessToken, STRAVA_FETCH_SIZE, 1, currentBefore);
        runs.push(...activities.filter((a) => a.type === 'Run'));
        stravaHasMore = activities.length === STRAVA_FETCH_SIZE;
        if (activities.length > 0) {
          const last = activities[activities.length - 1];
          currentBefore = Math.floor(new Date(last.start_date).getTime() / 1000);
        }
        calls++;
      }

      const stats = await statsPromise;

      const trimmed = runs.slice(0, perPage);
      const formatted = trimmed.map(formatStravaActivity);

      const hasMore = stravaHasMore || runs.length > perPage;
      const lastRun = trimmed[trimmed.length - 1];
      const nextCursor = hasMore && lastRun
        ? Math.floor(new Date(lastRun.start_date).getTime() / 1000)
        : null;

      return NextResponse.json({
        activities: formatted,
        hasMore,
        totalCount: stats.all_run_totals.count,
        nextCursor,
      });
    },
    { logContext: 'get-strava-activities' }
  );
}
