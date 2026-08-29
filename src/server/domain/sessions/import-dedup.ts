import 'server-only';
import { prisma } from '@/server/database';

const CROSS_SOURCE_TIME_WINDOW_MS = 3 * 60 * 1000;
const CROSS_SOURCE_DISTANCE_TOLERANCE = 0.05;
const DAY_MS = 24 * 60 * 60 * 1000;
// Legacy sessions (v1 Strava-era imports and manual entries) store the civil day at
// midnight UTC with no time of day; the app's data is Paris-based.
const LEGACY_DAY_TIMEZONE = 'Europe/Paris';

function isMidnightUtc(time: number): boolean {
  return time % DAY_MS === 0;
}

function civilDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export interface WorkoutWindow {
  time: number;
  distanceMeters: number | null;
}

export async function findExistingWorkoutWindows(
  userId: string,
  oldest: Date
): Promise<WorkoutWindow[]> {
  const workouts = await prisma.workouts.findMany({
    where: { userId, date: { gte: oldest } },
    select: {
      date: true,
      workout_metrics_raw: { select: { distanceMeters: true } },
    },
  });

  return workouts.map((w) => ({
    time: w.date.getTime(),
    distanceMeters: w.workout_metrics_raw?.distanceMeters ?? null,
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

    if (isMidnightUtc(w.time)) {
      const workoutDay = new Date(w.time).toISOString().slice(0, 10);
      return workoutDay === civilDay(activityDate, LEGACY_DAY_TIMEZONE) && distanceMatches;
    }

    if (Math.abs(w.time - activityDate.getTime()) > CROSS_SOURCE_TIME_WINDOW_MS) return false;
    return distanceMatches;
  });
}
