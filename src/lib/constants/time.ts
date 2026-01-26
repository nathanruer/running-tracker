// ============================================================================
// MILLISECOND CONVERSIONS
// ============================================================================

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MS_PER_WEEK = 7 * MS_PER_DAY;

// ============================================================================
// REACT QUERY CACHE DURATIONS
// ============================================================================

/**
 * Cache durations for React Query staleTime
 */
export const CACHE_TIME = {
  DEFAULT: 5 * MS_PER_MINUTE,
  USER: 10 * MS_PER_MINUTE,
  SESSION_TYPES: 15 * MS_PER_MINUTE,
  SESSIONS: Infinity,
  CONVERSATIONS: 30 * MS_PER_SECOND,
  STRAVA_ACTIVITIES: 10 * MS_PER_MINUTE,
} as const;

/**
 * Garbage collection time for React Query
 */
export const GC_TIME = {
  DEFAULT: 10 * MS_PER_MINUTE,
} as const;

// ============================================================================
// SESSION & COOKIE DURATIONS
// ============================================================================

export const SESSION_DURATION = MS_PER_WEEK;

export const JWT_EXPIRES_IN = '7d';

// ============================================================================
// DATE RANGE PRESETS
// ============================================================================

/**
 * Predefined date ranges for analytics and filtering
 */
export const DATE_RANGES = {
  TWO_WEEKS: 14 * MS_PER_DAY,
  FOUR_WEEKS: 28 * MS_PER_DAY,
  TWELVE_WEEKS: 84 * MS_PER_DAY,
  MIN_CUSTOM_RANGE: 14,
} as const;

// ============================================================================
// API & STRAVA TIMEOUTS
// ============================================================================

export const API_TIME_BUFFER = 5 * MS_PER_MINUTE;

// ============================================================================
// UI DELAYS & TRANSITIONS
// ============================================================================

export const UI_DELAYS = {
  DIALOG_CLOSE: 300,
  TOOLTIP: 150,
  QUERY_INVALIDATION: 500,
  TRUNCATION_DETECTION: 50,
} as const;

// ============================================================================
// TOAST CONFIGURATION
// ============================================================================

export const TOAST_CONFIG = {
  LIMIT: 1,
  REMOVE_DELAY: 1000000,
} as const;

// ============================================================================
// TEST TIMEOUTS
// ============================================================================

export const TEST_TIMEOUT = 100;
