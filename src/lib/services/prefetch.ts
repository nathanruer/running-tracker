import { QueryClient } from '@tanstack/react-query';
import { getCurrentUser, getSessions, getConversations } from './api-client';
import { queryKeys } from '@/lib/constants/query-keys';
import type { TrainingSession, User } from '@/lib/types';

/**
 * Prefetch utilities for navigation
 * Centralizes all prefetching logic to avoid duplication between AppNavigation and BottomNavigation
 */

const DASHBOARD_PAGE_SIZE = 10;

async function prefetchUser(queryClient: QueryClient): Promise<User | null> {
  try {
    return await queryClient.fetchQuery({
      queryKey: queryKeys.user(),
      queryFn: getCurrentUser,
      staleTime: 10 * 60 * 1000,
    });
  } catch {
    return null;
  }
}

/**
 * Prefetches data needed for the Profile page
 */
export async function prefetchProfileData(queryClient: QueryClient): Promise<void> {
  const user = await prefetchUser(queryClient);
  const userId = user?.id ?? null;

  await queryClient.prefetchQuery({
    queryKey: queryKeys.sessionsAll(userId),
    queryFn: () => getSessions(undefined, undefined, undefined, undefined, undefined, undefined, 'analytics'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetches data needed for the Dashboard page
 */
export async function prefetchDashboardData(queryClient: QueryClient): Promise<void> {
  const user = await prefetchUser(queryClient);
  const userId = user?.id ?? null;

  const params = {
    selectedType: 'all',
    sortKey: 'default',
    search: '',
    dateFrom: undefined as string | undefined,
    userId,
  };

  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.sessionsPaginated(params),
    queryFn: ({ pageParam = 0 }) =>
      getSessions(DASHBOARD_PAGE_SIZE, pageParam, 'all', undefined, undefined, undefined, undefined, 'table'),
    initialPageParam: 0,
    getNextPageParam: (lastPage: TrainingSession[], allPages: TrainingSession[][]) =>
      lastPage.length === DASHBOARD_PAGE_SIZE ? allPages.length * DASHBOARD_PAGE_SIZE : undefined,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetches data needed for the Chat page
 */
export async function prefetchChatData(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.conversations(),
    queryFn: getConversations,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Prefetches data based on route
 * Useful for bottom navigation or generic prefetch triggers
 */
export async function prefetchDataForRoute(
  queryClient: QueryClient,
  route: string
): Promise<void> {
  if (route === '/profile') {
    await prefetchProfileData(queryClient);
    return;
  }

  if (route === '/dashboard') {
    await prefetchDashboardData(queryClient);
    return;
  }

  if (route === '/chat') {
    await prefetchChatData(queryClient);
  }
}
