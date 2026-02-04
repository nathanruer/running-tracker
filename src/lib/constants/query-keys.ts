/**
 * React Query keys for consistent cache management
 */

export const QUERY_KEYS = {
  USER: 'user',
  SESSIONS: 'sessions',
  SESSION_TYPES: 'sessionTypes',
  CONVERSATIONS: 'conversations',
  CONVERSATION: 'conversation',
  ANALYTICS: 'analytics',
  STRAVA_ACTIVITIES: 'stravaActivities',
  SESSIONS_COUNT: 'sessionsCount',
} as const;

/**
 * Helper functions for building complex query keys
 */
export const queryKeys = {
  user: () => [QUERY_KEYS.USER] as const,
  sessions: () => [QUERY_KEYS.SESSIONS] as const,
  sessionsAll: (userId?: string | null) => [QUERY_KEYS.SESSIONS, 'all', userId ?? null] as const,
  sessionById: (id: string | null) => [QUERY_KEYS.SESSIONS, 'detail', id] as const,
  sessionsHistory: () => [QUERY_KEYS.SESSIONS, 'history'] as const,
  sessionsPaginated: (params: {
    selectedType: string;
    sortKey: string;
    search: string;
    dateFrom?: string;
    userId?: string | null;
  }) => [QUERY_KEYS.SESSIONS, 'paginated', params] as const,
  sessionsCountBase: () => [QUERY_KEYS.SESSIONS_COUNT] as const,
  sessionsCount: (params: {
    selectedType: string;
    search: string;
    dateFrom?: string;
    userId?: string | null;
  }) => [QUERY_KEYS.SESSIONS_COUNT, params] as const,
  sessionTypesBase: () => [QUERY_KEYS.SESSION_TYPES] as const,
  sessionTypes: (userId?: string | null) => [QUERY_KEYS.SESSION_TYPES, userId ?? null] as const,
  conversations: () => [QUERY_KEYS.CONVERSATIONS] as const,
  conversation: (id: string | null) => [QUERY_KEYS.CONVERSATION, id] as const,
  analytics: {
    all: () => [QUERY_KEYS.ANALYTICS] as const,
    byRange: (range: string) => [QUERY_KEYS.ANALYTICS, range] as const,
  },
  stravaActivities: () => [QUERY_KEYS.STRAVA_ACTIVITIES] as const,
} as const;
