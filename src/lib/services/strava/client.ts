import type { StravaTokens, StravaActivity } from '@/lib/types';
import { logger } from '@/lib/infrastructure/logger';
import { STRAVA_URLS, GRANT_TYPES } from '@/lib/constants';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

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

export async function getActivities(
  accessToken: string,
  perPage: number = 30
): Promise<StravaActivity[]> {
  const response = await fetch(
    `${STRAVA_URLS.ACTIVITIES}?per_page=${perPage}`,
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
