import { useQuery } from '@tanstack/react-query';
import { getConversations, type Conversation } from '@/lib/services/api-client';
import { CACHE_TIME } from '@/lib/constants';

/**
 * Centralized hook for fetching conversations list.
 * Handles caching, loading states, and skeleton visibility logic.
 */
export function useConversations() {
  const { data: conversations = [], isLoading, ...rest } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: CACHE_TIME.CONVERSATIONS,
  });

  const showSkeleton = isLoading && conversations.length === 0;

  return {
    conversations,
    isLoading,
    showSkeleton,
    ...rest,
  };
}

export type { Conversation };
