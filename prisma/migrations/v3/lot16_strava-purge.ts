// Lot 16 — purge Strava : séances des comptes de test supprimées, comptes Strava supprimés,
// séances Strava du compte réel re-liées à leur activité intervals.icu (jour civil + distance ±5 %),
// sources Strava restantes supprimées. L'enum est nettoyé ensuite par lot16_strava-purge.sql.
// Dry-run par défaut. Usage: DATABASE_URL=<rôle propriétaire> npx tsx prisma/migrations/v3/lot16_strava-purge.ts [--apply]
import { PrismaClient } from '@prisma/client';

const REAL_USER = 'cmjolkrri0000itv5h3jy8w5v';
const TZ = 'Europe/Paris';
const DISTANCE_TOLERANCE = 0.05;
const IMPORTABLE_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

interface StravaSourceRow {
  source_id: string;
  external_id: string;
  workout_id: string;
  started_at: Date;
  distance_m: number | null;
}

interface IntervalsActivity {
  id: string;
  type?: string | null;
  start_date?: string | null;
  start_date_local: string;
  distance?: number | null;
  [key: string]: unknown;
}

function civilDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

async function fetchActivities(apiKey: string, oldest: string, newest: string): Promise<IntervalsActivity[]> {
  const url = `https://intervals.icu/api/v1/athlete/0/activities?oldest=${oldest}T00:00:00&newest=${newest}T23:59:59`;
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString('base64')}` },
  });
  if (!response.ok) throw new Error(`intervals.icu ${response.status} ${await response.text()}`);
  const activities = (await response.json()) as IntervalsActivity[];
  return activities.filter((activity) => IMPORTABLE_TYPES.has(activity.type ?? ''));
}

async function main() {
  console.log(apply ? 'APPLY' : 'DRY-RUN');

  // 1. Séances des comptes de test
  const testUsers = await prisma.$queryRawUnsafe<Array<{ id: string; email: string; workouts: number; planned: number }>>(
    `SELECT u.id, u.email,
            (SELECT count(*)::int FROM workouts w WHERE w.user_id = u.id) AS workouts,
            (SELECT count(*)::int FROM planned_workouts p WHERE p.user_id = u.id) AS planned
     FROM users u WHERE u.id <> $1 ORDER BY u.email`,
    REAL_USER
  );
  for (const user of testUsers) {
    console.log(`test account ${user.email}: ${user.workouts} workouts, ${user.planned} planned → delete`);
  }
  if (apply && testUsers.length) {
    const ids = testUsers.map((user) => user.id);
    await prisma.$executeRawUnsafe(`DELETE FROM planned_workouts WHERE user_id = ANY($1::text[])`, ids);
    await prisma.$executeRawUnsafe(`DELETE FROM workouts WHERE user_id = ANY($1::text[])`, ids);
  }

  // 2. Comptes connectés Strava
  const stravaAccounts = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT count(*)::int AS count FROM connected_accounts WHERE provider = 'strava'`
  );
  console.log(`strava connected accounts: ${stravaAccounts[0].count} → delete`);
  if (apply) await prisma.$executeRawUnsafe(`DELETE FROM connected_accounts WHERE provider = 'strava'`);

  // 3. Re-liaison des séances Strava du compte réel
  const rows = await prisma.$queryRawUnsafe<StravaSourceRow[]>(
    `SELECT s.id AS source_id, s.external_id, w.id AS workout_id, w.started_at, w.distance_m
     FROM workout_sources s JOIN workouts w ON w.id = s.workout_id
     WHERE s.provider = 'strava' AND w.user_id = $1 ORDER BY w.started_at`,
    REAL_USER
  );
  console.log(`strava-sourced workouts of the real account: ${rows.length}`);

  let relinked = 0;
  let unlinked = 0;
  if (rows.length) {
    const key = await prisma.$queryRawUnsafe<Array<{ access_token: string | null }>>(
      `SELECT access_token FROM connected_accounts WHERE user_id = $1 AND provider = 'intervals_icu'`,
      REAL_USER
    );
    const apiKey = key[0]?.access_token;
    if (!apiKey) throw new Error('no intervals.icu key for the real account');

    const oldest = civilDay(new Date(rows[0].started_at.getTime() - 86400000));
    const newest = civilDay(new Date(rows[rows.length - 1].started_at.getTime() + 86400000));
    const activities = await fetchActivities(apiKey, oldest, newest);
    console.log(`intervals.icu activities ${oldest} → ${newest}: ${activities.length}`);

    const linkedIds = new Set(
      (await prisma.$queryRawUnsafe<Array<{ external_id: string }>>(
        `SELECT external_id FROM workout_sources WHERE user_id = $1 AND provider = 'intervals_icu'`,
        REAL_USER
      )).map((row) => row.external_id)
    );

    for (const row of rows) {
      const day = civilDay(row.started_at);
      const candidates = activities.filter((activity) => {
        if (activity.start_date_local.slice(0, 10) !== day || linkedIds.has(activity.id)) return false;
        if (row.distance_m == null || !activity.distance) return true;
        return Math.abs(activity.distance - row.distance_m) / row.distance_m <= DISTANCE_TOLERANCE;
      });
      candidates.sort((a, b) =>
        Math.abs((a.distance ?? 0) - (row.distance_m ?? 0)) - Math.abs((b.distance ?? 0) - (row.distance_m ?? 0))
      );
      const match = candidates[0];
      if (!match) {
        unlinked++;
        console.log(`  ${day} ${row.distance_m ?? '?'} m strava ${row.external_id} → NO MATCH, source dropped`);
        if (apply) await prisma.$executeRawUnsafe(`DELETE FROM workout_sources WHERE id = $1`, row.source_id);
        continue;
      }
      relinked++;
      linkedIds.add(match.id);
      console.log(`  ${day} ${row.distance_m ?? '?'} m strava ${row.external_id} → intervals ${match.id} (${Math.round(match.distance ?? 0)} m)`);
      if (apply) {
        await prisma.$executeRawUnsafe(
          `UPDATE workout_sources
           SET provider = 'intervals_icu', external_id = $2, raw_payload = $3::jsonb, payload_kind = 'activity',
               started_at = $4::timestamptz, intervals_status = 'pending', synced_at = now(), updated_at = now()
           WHERE id = $1`,
          row.source_id, match.id, JSON.stringify(match), match.start_date ?? row.started_at.toISOString()
        );
      }
    }
  }

  // 4. Sources Strava restantes
  const remaining = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT count(*)::int AS count FROM workout_sources WHERE provider = 'strava'`
  );
  console.log(`remaining strava sources: ${remaining[0].count}${apply ? ' → delete' : ''}`);
  if (apply) await prisma.$executeRawUnsafe(`DELETE FROM workout_sources WHERE provider = 'strava'`);

  console.log(`relinked ${relinked}, unlinked ${unlinked}${apply ? ' (applied)' : ''}`);
}

main().finally(() => prisma.$disconnect());
