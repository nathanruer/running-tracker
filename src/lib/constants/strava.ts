// ============================================================================
// STRAVA API URLS
// ============================================================================

export const STRAVA_URLS = {
  TOKEN: 'https://www.strava.com/oauth/token',

  ACTIVITIES: 'https://www.strava.com/api/v3/athlete/activities',

  API_BASE: 'https://www.strava.com/api/v3',

  ACTIVITY_BASE: 'https://www.strava.com/activities',
} as const;

// ============================================================================
// STRAVA ERROR CODES
// ============================================================================

export const STRAVA_ERRORS = {
  ALREADY_LINKED: 'strava_already_linked',
  API_LIMIT: 'strava_api_limit',
  AUTH_FAILED: 'strava_auth_failed',
  MISSING_CODE: 'missing_strava_code',
  TOKEN_EXCHANGE_FAILED: 'strava_token_exchange_failed',
  REFRESH_FAILED: 'strava_refresh_failed',
} as const;

// ============================================================================
// STRAVA SUCCESS CODES
// ============================================================================

export const STRAVA_SUCCESS = {
  CONNECTED: 'strava_connected',
  DISCONNECTED: 'strava_disconnected',
} as const;

// ============================================================================
// STRAVA CONFIGURATION
// ============================================================================

export const STRAVA_SCOPES = {
  ACTIVITY_READ: 'activity:read',
  ACTIVITY_READ_ALL: 'activity:read_all',
  ACTIVITY_WRITE: 'activity:write',
} as const;

export const STRAVA_DEFAULT_SCOPE = 'activity:read_all';
