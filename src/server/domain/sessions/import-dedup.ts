import 'server-only';
import { prisma } from '@/server/database';
import { civilDayInZone } from '@/lib/utils/date/zoned';

const CROSS_SOURCE_TIME_WINDOW_MS = 3 * 60 * 1000;
const CROSS_SOURCE_DISTANCE_TOLERANCE = 0.05;

export interface WorkoutWindow {
  time: number;
  precision: 'instant' | 'day';
  timezone: string;
  distanceMeters: number | null;
}

export async function findExistingWorkoutWindows(
  userId: string,
  oldest: Date
): Promise<WorkoutWindow[]> {
  const workouts = await prisma.workouts.findMany({
    where: { userId, startedAt: { gte: oldest } },
    select: { startedAt: true, datePrecision: true, timezone: true, distanceM: true },
  });

  return workouts.map((w) => ({
    time: w.startedAt.getTime(),
    precision: w.datePrecision,
    timezone: w.timezone,
    distanceMeters: w.distanceM,
  }));
}

export function matchesExistingWorkout(
  existing: WorkoutWindow[],
  activityDate: Date,
  activityDistanceMeters: number
): boolean {
  return existing.some((w) => {
    const distanceMatches =
      w.distanceMeters == null ||
      activityDistanceMeters <= 0 ||
      Math.abs(w.distanceMeters - activityDistanceMeters) / activityDistanceMeters <=
        CROSS_SOURCE_DISTANCE_TOLERANCE;

    // Day-precision sessions (manual entries) only know their civil day.
    if (w.precision === 'day') {
      return civilDayInZone(new Date(w.time), w.timezone) === civilDayInZone(activityDate, w.timezone) && distanceMatches;
    }

    if (Math.abs(w.time - activityDate.getTime()) > CROSS_SOURCE_TIME_WINDOW_MS) return false;
    return distanceMatches;
  });
}
