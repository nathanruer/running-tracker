'use client';

import { useQuery } from '@tanstack/react-query';
import { getIntervalsActivitiesList } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';

export function useNewIntervalsCount() {
  const { data } = useQuery({
    queryKey: [...queryKeys.intervalsActivities(), 'recent-count'],
    queryFn: () => getIntervalsActivitiesList({ recent: true }),
    staleTime: 15 * 60 * 1000,
    retry: false,
    meta: { silentError: true },
  });

  // One outing counts once: fragments hang off their main activity, ignored ones do not count.
  return data?.activities.filter((a) => !a.alreadyImported && !a.dismissed && !a.partOf).length ?? 0;
}
