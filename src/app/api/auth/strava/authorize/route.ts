import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import {
  STRAVA_STATE_COOKIE_NAME,
  STRAVA_STATE_MAX_AGE,
  COOKIE_CONFIG,
} from '@/lib/constants';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

export async function GET() {
  if (!STRAVA_CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Configuration Strava manquante' },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString('hex');

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.append('client_id', STRAVA_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'activity:read');
  authUrl.searchParams.append('approval_prompt', 'auto');
  authUrl.searchParams.append('state', state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(STRAVA_STATE_COOKIE_NAME, state, {
    httpOnly: COOKIE_CONFIG.HTTP_ONLY,
    secure: COOKIE_CONFIG.SECURE,
    sameSite: COOKIE_CONFIG.SAME_SITE,
    path: '/',
    maxAge: STRAVA_STATE_MAX_AGE,
  });

  return response;
}
