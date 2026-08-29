'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlannedSessions } from '@/lib/services/api-client/sessions';
import { queryKeys } from '@/lib/constants/query-keys';
import type { TrainingSession } from '@/lib/types';

const MAX_UPCOMING = 6;

function plannedTime(session: TrainingSession): number {
  return session.plannedDate ? new Date(session.plannedDate).getTime() : Number.POSITIVE_INFINITY;
}

export function useUpcomingSessions(userId: string | null | undefined) {
  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.plannedUpcoming(userId),
    queryFn: getPlannedSessions,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const upcoming = useMemo(
    () =>
      [...data]
        .filter((session) => session.status === 'planned')
        .sort((a, b) => plannedTime(a) - plannedTime(b))
        .slice(0, MAX_UPCOMING),
    [data]
  );

  return { upcoming, isLoading };
}
