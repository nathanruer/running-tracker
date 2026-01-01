/**
 * React Query keys for consistent cache management
 */

export const QUERY_KEYS = {
  /** User authentication data */
  USER: 'user',

  /** Training sessions list */
  SESSIONS: 'sessions',

  /** Available session types */
  SESSION_TYPES: 'sessionTypes',

  /** Chat conversations list */
  CONVERSATIONS: 'conversations',

  /** Single conversation data */
  CONVERSATION: 'conversation',

  /** User analytics data */
  ANALYTICS: 'analytics',

  /** Strava activities */
  STRAVA_ACTIVITIES: 'stravaActivities',
} as const;

/**
 * Helper functions for building complex query keys
 */
export const queryKeys = {
  user: () => [QUERY_KEYS.USER] as const,

  sessions: {
    all: () => [QUERY_KEYS.SESSIONS] as const,
    paginated: (type: string) => [QUERY_KEYS.SESSIONS, 'paginated', type] as const,
    filtered: (type: string) => [QUERY_KEYS.SESSIONS, 'filtered', type] as const,
    list: (filters?: Record<string, unknown>) => [QUERY_KEYS.SESSIONS, filters] as const,
  },

  sessionTypes: () => [QUERY_KEYS.SESSION_TYPES] as const,

  conversations: {
    all: () => [QUERY_KEYS.CONVERSATIONS] as const,
    detail: (id: string) => [QUERY_KEYS.CONVERSATION, id] as const,
    messages: (id: string) => [QUERY_KEYS.CONVERSATION, id, 'messages'] as const,
  },

  analytics: {
    all: () => [QUERY_KEYS.ANALYTICS] as const,
    byRange: (range: string) => [QUERY_KEYS.ANALYTICS, range] as const,
  },

  stravaActivities: () => [QUERY_KEYS.STRAVA_ACTIVITIES] as const,
} as const;
