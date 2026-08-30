import { describe, it, expect } from 'vitest';
import { groupFragmentActivities } from '../fragments';
import type { IntervalsActivity } from '../client';

const activity = (
  id: string,
  start: string,
  movingTime: number,
  elapsed = movingTime
): IntervalsActivity => ({
  id,
  start_date: start,
  start_date_local: start.replace('Z', ''),
  moving_time: movingTime,
  elapsed_time: elapsed,
  type: 'Run',
});

describe('groupFragmentActivities', () => {
  it('groups the warm-up and the workout recorded separately, keeping the longest as the session', () => {
    const groups = groupFragmentActivities([
      activity('i181266970', '2026-08-30T09:26:12Z', 1324, 1331),
      activity('i181258108', '2026-08-30T09:15:43Z', 454, 487),
    ]);

    expect(groups).toEqual([{ mainId: 'i181266970', fragmentIds: ['i181258108'] }]);
  });

  it('leaves two runs of the same day apart when they are hours away', () => {
    expect(groupFragmentActivities([
      activity('a', '2026-08-30T07:00:00Z', 1800),
      activity('b', '2026-08-30T18:00:00Z', 1800),
    ])).toEqual([]);
  });

  it('chains three consecutive recordings into a single group', () => {
    const groups = groupFragmentActivities([
      activity('a', '2026-08-30T09:00:00Z', 300),
      activity('b', '2026-08-30T09:07:00Z', 1200),
      activity('c', '2026-08-30T09:29:00Z', 240),
    ]);

    expect(groups).toEqual([{ mainId: 'b', fragmentIds: ['a', 'c'] }]);
  });

  it('has nothing to offer for a single activity', () => {
    expect(groupFragmentActivities([activity('a', '2026-08-30T09:00:00Z', 1800)])).toEqual([]);
  });
});
