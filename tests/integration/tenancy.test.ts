/**
 * Row level security isolation — runs against a real PostgreSQL with lot 12 applied.
 * INTEGRATION_ADMIN_URL: owner role (creates the fixtures), INTEGRATION_APP_URL: app_user role.
 * Example: INTEGRATION_ADMIN_URL=postgresql://postgres:rt@localhost:5433/rt \
 *          INTEGRATION_APP_URL=postgresql://app_user:rt-app@localhost:5433/rt npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createBaseClient, createTenantTransaction, withTenantIsolation } from '@/server/database/prisma';
import { runAsUser } from '@/server/database/tenant';

const adminUrl = process.env.INTEGRATION_ADMIN_URL;
const appUrl = process.env.INTEGRATION_APP_URL;

describe.skipIf(!adminUrl || !appUrl)('tenant isolation (RLS)', () => {
  const admin = createBaseClient(adminUrl);
  const base = createBaseClient(appUrl);
  const app = withTenantIsolation(base);
  const tenantTransaction = createTenantTransaction(base);
  const stamp = Date.now();
  const userA = `it-a-${stamp}`;
  const userB = `it-b-${stamp}`;
  let workoutA = '';

  beforeAll(async () => {
    await admin.users.createMany({
      data: [
        { id: userA, email: `${userA}@test.local`, password: 'x' },
        { id: userB, email: `${userB}@test.local`, password: 'x' },
      ],
    });
    const workout = await admin.workouts.create({
      data: { userId: userA, startedAt: new Date('2026-05-01T06:00:00Z'), timezone: 'Europe/Paris', datePrecision: 'instant', durationS: 1800 },
    });
    workoutA = workout.id;
    await admin.workout_streams.create({ data: { workoutId: workoutA, time: [0, 1, 2], sampleCount: 3 } });
  });

  afterAll(async () => {
    await admin.users.deleteMany({ where: { id: { in: [userA, userB] } } });
    await Promise.all([admin.$disconnect(), base.$disconnect()]);
  });

  it('shows a user only their own rows, including child tables', async () => {
    const [ownWorkouts, ownStreams] = await runAsUser(userA, () =>
      Promise.all([app.workouts.findMany({ where: { id: workoutA } }), app.workout_streams.findMany({ where: { workoutId: workoutA } })])
    );
    expect(ownWorkouts).toHaveLength(1);
    expect(ownStreams).toHaveLength(1);

    const [otherWorkouts, otherStreams, otherUser] = await runAsUser(userB, () =>
      Promise.all([
        app.workouts.findMany({ where: { id: workoutA } }),
        app.workout_streams.findMany({ where: { workoutId: workoutA } }),
        app.users.findUnique({ where: { id: userA } }),
      ])
    );
    expect(otherWorkouts).toHaveLength(0);
    expect(otherStreams).toHaveLength(0);
    expect(otherUser).toBeNull();
  });

  it('hides everything without a tenant context (fail closed)', async () => {
    expect(await app.workouts.findMany({ where: { id: workoutA } })).toHaveLength(0);
    expect(await app.users.count()).toBe(0);
  });

  it('blocks writes on rows of another user', async () => {
    const updated = await runAsUser(userB, () => app.workouts.updateMany({ where: { id: workoutA }, data: { notes: 'hacked' } }));
    expect(updated.count).toBe(0);

    await expect(
      runAsUser(userB, () =>
        app.workouts.create({
          data: { userId: userA, startedAt: new Date(), timezone: 'Europe/Paris', datePrecision: 'day' },
        })
      )
    ).rejects.toThrow(/row-level security/);

    const untouched = await admin.workouts.findUnique({ where: { id: workoutA } });
    expect(untouched?.notes).toBe('');
  });

  it('keeps the tenant inside interactive transactions and raw queries', async () => {
    const seen = await runAsUser(userA, () =>
      tenantTransaction(async (tx) => {
        await tx.workouts.update({ where: { id: workoutA }, data: { notes: 'depuis la transaction' } });
        return tx.workouts.count({ where: { userId: userA } });
      })
    );
    expect(seen).toBe(1);

    const raw = await runAsUser(userA, () => app.$queryRawUnsafe<Array<{ count: number }>>('SELECT count(*)::int AS count FROM workouts'));
    expect(raw[0].count).toBe(1);

    const rawOther = await runAsUser(userB, () => app.$queryRawUnsafe<Array<{ count: number }>>('SELECT count(*)::int AS count FROM workouts'));
    expect(rawOther[0].count).toBe(0);
  });
});
