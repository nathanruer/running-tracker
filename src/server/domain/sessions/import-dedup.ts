import 'server-only';
import { prisma } from '@/server/database';

const CROSS_SOURCE_TIME_WINDOW_MS = 3 * 60 * 1000;
const CROSS_SOURCE_DISTANCE_TOLERANCE = 0.05;

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
    if (Math.abs(w.time - activityDate.getTime()) > CROSS_SOURCE_TIME_WINDOW_MS) return false;
    if (w.distanceMeters == null || activityDistanceMeters <= 0) return true;
    const ratio = Math.abs(w.distanceMeters - activityDistanceMeters) / activityDistanceMeters;
    return ratio <= CROSS_SOURCE_DISTANCE_TOLERANCE;
  });
}
