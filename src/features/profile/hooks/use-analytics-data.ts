'use client';

import { useQuery } from '@tanstack/react-query';
import { getSessionsAnalytics } from '@/lib/services/api-client/sessions';
import { EMPTY_BUCKETED_STATS } from '@/lib/domain/analytics/compute-analytics';
import type { AnalyticsFilters } from '@/lib/domain/analytics/compute-analytics';
import { queryKeys } from '@/lib/constants/query-keys';

export type { AnalyticsFilters };

export function useAnalyticsData(filters: AnalyticsFilters) {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.sessions(), 'analytics', filters],
    queryFn: () => getSessionsAnalytics(filters),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  return {
    customDateError: data?.customDateError ?? '',
    rangeLabel: data?.rangeLabel ?? '',
    stats: data?.stats ?? EMPTY_BUCKETED_STATS,
    isLoading,
  };
}
