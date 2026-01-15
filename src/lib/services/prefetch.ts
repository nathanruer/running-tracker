import { QueryClient } from '@tanstack/react-query';
import { getCurrentUser, getSessions, getConversations } from './api-client';

/**
 * Prefetch utilities for navigation
 * Centralizes all prefetching logic to avoid duplication between AppNavigation and BottomNavigation
 */

/**
 * Prefetches data needed for the Profile page
 */
export function prefetchProfileData(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });
  queryClient.prefetchQuery({
    queryKey: ['sessions', 'all'],
    queryFn: () => getSessions(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetches data needed for the Dashboard page
 */
export function prefetchDashboardData(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: ['sessions'],
    queryFn: () => getSessions(20, 0, 'all'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Prefetches data needed for the Chat page
 */
export function prefetchChatData(queryClient: QueryClient): void {
  queryClient.prefetchQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Prefetches data based on route
 * Useful for bottom navigation or generic prefetch triggers
 */
export function prefetchDataForRoute(queryClient: QueryClient, route: string): void {
  if (route === '/profile') {
    prefetchProfileData(queryClient);
  } else if (route === '/dashboard') {
    prefetchDashboardData(queryClient);
  } else if (route === '/chat') {
    prefetchChatData(queryClient);
  }
}
