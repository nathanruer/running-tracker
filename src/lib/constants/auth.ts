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

// ============================================================================
// JWT
// ============================================================================

/**
 * JWT token configuration
 */
export const JWT_CONFIG = {
  EXPIRES_IN: '7d',

  ALGORITHM: 'HS256' as const,
} as const;

// ============================================================================
// AUTHORIZATION HEADER
// ============================================================================

/**
 * Authorization header configuration
 */
export const AUTH_HEADER = {
  NAME: 'authorization',
  PREFIX: 'Bearer ',
} as const;

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
// CLIENT CACHE
// ============================================================================

/**
 * LocalStorage key for React Query persisted cache
 */
export const CACHE_STORAGE_KEY = 'RUNNING_TRACKER_OFFLINE_CACHE';

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
