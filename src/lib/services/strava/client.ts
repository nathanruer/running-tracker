import type { StravaTokens, StravaActivity, StravaStreamSet, StravaStreamType } from '@/lib/types';
import { logger } from '@/lib/infrastructure/logger';
import { STRAVA_URLS } from '@/lib/constants/strava';
import { GRANT_TYPES } from '@/lib/constants/auth';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

/**
 * Exchanges authorization code for access and refresh tokens
 * @param code Authorization code from Strava redirect
 * @returns Object containing access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<StravaTokens> {
  const response = await fetch(STRAVA_URLS.TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: GRANT_TYPES.AUTHORIZATION_CODE,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
}

/**
 * Refreshes an expired access token
 * @param refreshToken Current refresh token
 * @returns Object containing new access and refresh tokens
 */
export async function refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
  const response = await fetch(STRAVA_URLS.TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: GRANT_TYPES.REFRESH_TOKEN,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  return response.json();
}

/**
 * Fetches athlete's activities
 * @param accessToken Strava access token
 * @param perPage Number of activities per page (default: 30)
 * @returns List of activities
 */
export async function getActivities(
  accessToken: string,
  perPage: number = 30,
  page: number = 1
): Promise<StravaActivity[]> {
  const response = await fetch(
    `${STRAVA_URLS.ACTIVITIES}?per_page=${perPage}&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }

  return response.json();
}

/**
 * Fetches details for a specific activity
 * @param accessToken Strava access token
 * @param activityId ID of the activity
 * @returns Detailed activity object
 */
export async function getActivityDetails(
  accessToken: string,
  activityId: number
): Promise<StravaActivity> {
  const response = await fetch(
    `${STRAVA_URLS.API_BASE}/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logger.error({
      status: response.status,
      statusText: response.statusText,
      activityId,
      error: errorData,
    }, 'Strava API call failed: getActivityDetails');
    throw new Error(`Failed to fetch activity details: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Retrieves streams for a Strava activity
 * @param accessToken Strava access token
 * @param activityId Activity ID
 * @param keys Stream types to retrieve (default: velocity_smooth, distance, time)
 * @returns Object with requested streams (key_by_type=true)
 */
export async function getActivityStreams(
  accessToken: string,
  activityId: number,
  keys: StravaStreamType[] = ['velocity_smooth', 'distance', 'time', 'heartrate', 'cadence', 'altitude']
): Promise<StravaStreamSet> {
  const keysParam = keys.join(',');
  const url = `${STRAVA_URLS.API_BASE}/activities/${activityId}/streams?keys=${keysParam}&key_by_type=true`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logger.error({
      status: response.status,
      activityId,
      error: errorData,
    }, 'Strava API call failed: getActivityStreams');

    // If activity has no streams (e.g., treadmill run), return empty object
    if (response.status === 404) {
      logger.info({ activityId }, 'Activity has no streams available');
      return {};
    }

    throw new Error(`Failed to fetch activity streams: ${response.status}`);
  }

  return response.json();
}
