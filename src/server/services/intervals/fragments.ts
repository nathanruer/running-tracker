import 'server-only';
import type { IntervalsActivity } from './client';

/** Two recordings of the same outing: the watch was stopped and restarted within a few minutes. */
const FRAGMENT_GAP_MS = 15 * 60 * 1000;

export interface FragmentGroup {
  /** The activity carrying the session — the longest one. */
  mainId: string;
  fragmentIds: string[];
}

function startTime(activity: IntervalsActivity): number {
  return new Date(activity.start_date ?? activity.start_date_local).getTime();
}

function movingSeconds(activity: IntervalsActivity): number {
  return activity.moving_time ?? activity.elapsed_time ?? 0;
}

function endTime(activity: IntervalsActivity): number {
  return startTime(activity) + (activity.elapsed_time ?? movingSeconds(activity)) * 1000;
}

/**
 * Groups the activities that are pieces of a single outing, so the import can offer to merge them
 * instead of leaving two half sessions in the log.
 */
export function groupFragmentActivities(activities: IntervalsActivity[]): FragmentGroup[] {
  const ordered = [...activities]
    .filter((activity) => Number.isFinite(startTime(activity)))
    .sort((a, b) => startTime(a) - startTime(b));

  const groups: FragmentGroup[] = [];
  let current: IntervalsActivity[] = [];

  const flush = () => {
    if (current.length > 1) {
      const main = current.reduce((longest, activity) =>
        movingSeconds(activity) > movingSeconds(longest) ? activity : longest
      );
      groups.push({
        mainId: main.id,
        fragmentIds: current.filter((activity) => activity.id !== main.id).map((activity) => activity.id),
      });
    }
    current = [];
  };

  for (const activity of ordered) {
    const previous = current[current.length - 1];
    if (previous && startTime(activity) - endTime(previous) <= FRAGMENT_GAP_MS) {
      current.push(activity);
      continue;
    }
    flush();
    current = [activity];
  }
  flush();

  return groups;
}
