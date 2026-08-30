import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import {
  getIntervalsActivities,
  getIntervalsApiKey,
  groupFragmentActivities,
  mapIntervalsActivityToSessionPayload,
  IMPORTABLE_TYPES,
  INTERVALS_SOURCE,
} from '@/server/services/intervals';
import { getImportedExternalIds } from '@/server/domain/sessions/sessions-read';
import { getDismissedExternalIds } from '@/server/domain/sessions/dismissed-activities';
import {
  findExistingWorkoutWindows,
  matchesExistingWorkout,
} from '@/server/domain/sessions/import-dedup';

export const runtime = 'nodejs';

const DEFAULT_HISTORY_YEARS = 3;
const RECENT_WINDOW_DAYS = 30;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 19);
}

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const apiKey = await getIntervalsApiKey(userId);
      if (!apiKey) {
        return NextResponse.json(
          { error: 'intervals.icu non configuré : connecte ton compte depuis Profil → Compte.' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const recentOnly = request.nextUrl.searchParams.get('recent') === '1';
      const oldest = new Date();
      if (recentOnly) {
        oldest.setDate(oldest.getDate() - RECENT_WINDOW_DAYS);
      } else {
        oldest.setFullYear(oldest.getFullYear() - DEFAULT_HISTORY_YEARS);
      }
      const newest = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [activities, importedIds, existingWindows, dismissedIds] = await Promise.all([
        getIntervalsActivities(apiKey, toIsoDate(oldest), toIsoDate(newest)),
        getImportedExternalIds(userId, INTERVALS_SOURCE),
        findExistingWorkoutWindows(userId, oldest),
        getDismissedExternalIds(userId, INTERVALS_SOURCE),
      ]);

      const runs = activities
        .filter((a) => IMPORTABLE_TYPES.has(a.type ?? ''))
        .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local));

      // Split recordings of one outing: the main activity carries the others as fragments.
      const fragmentsOfMain = new Map<string, string[]>();
      const mainOfFragment = new Map<string, string>();
      for (const group of groupFragmentActivities(runs)) {
        fragmentsOfMain.set(group.mainId, group.fragmentIds);
        for (const fragmentId of group.fragmentIds) mainOfFragment.set(fragmentId, group.mainId);
      }

      const formatted = runs.map((activity) => {
        const payload = mapIntervalsActivityToSessionPayload(activity, []);
        const alreadyImported =
          importedIds.has(activity.id) ||
          matchesExistingWorkout(
            existingWindows,
            new Date(activity.start_date_local),
            activity.distance ?? 0
          );

        return {
          ...payload,
          alreadyImported,
          dismissed: dismissedIds.has(activity.id),
          fragmentIds: fragmentsOfMain.get(activity.id) ?? [],
          partOf: mainOfFragment.get(activity.id) ?? null,
        };
      });

      return NextResponse.json({
        activities: formatted,
        hasMore: false,
        totalCount: formatted.length,
        nextCursor: null,
      });
    },
    { logContext: 'get-intervals-activities' }
  );
}
