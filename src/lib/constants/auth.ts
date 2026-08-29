import { SESSION_DURATION } from './time';

// ============================================================================
// SESSION COOKIE
// ============================================================================

/**
 * Name of the session cookie
 */
export const SESSION_COOKIE_NAME = 'rt_session';

/**
 * Cookie configuration options
 */
export const COOKIE_CONFIG = {
  HTTP_ONLY: true,
  SAME_SITE: 'lax' as const,
  PATH: '/',

  get SECURE(): boolean {
    return process.env.NODE_ENV === 'production';
  },

  get MAX_AGE(): number {
    return SESSION_DURATION / 1000;
  },
} as const;

/**
 * Name of the short-lived cookie carrying the Strava OAuth state
 */
export const STRAVA_STATE_COOKIE_NAME = 'rt_strava_state';

/**
 * Lifetime of the Strava OAuth state cookie (seconds)
 */
export const STRAVA_STATE_MAX_AGE = 10 * 60;

// ============================================================================
// OAUTH GRANT TYPES
// ============================================================================

/**
 * OAuth 2.0 grant types
 */
export const GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// ============================================================================
// ENVIRONMENT CHECKS
// ============================================================================

/**
 * Environment detection helpers
 */
export const ENV = {
  get IS_PRODUCTION(): boolean {
    return process.env.NODE_ENV === 'production';
  },

  get IS_DEVELOPMENT(): boolean {
    return process.env.NODE_ENV === 'development';
  },

  get IS_TEST(): boolean {
    return process.env.NODE_ENV === 'test';
  },
} as const;
