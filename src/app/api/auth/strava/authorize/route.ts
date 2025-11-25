import { NextRequest, NextResponse } from 'next/server';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

export async function GET(request: NextRequest) {
  if (!STRAVA_CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Configuration Strava manquante' },
      { status: 500 }
    );
  }

  const authUrl = new URL('https://www.strava.com/oauth/authorize');
  authUrl.searchParams.append('client_id', STRAVA_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'activity:read');
  authUrl.searchParams.append('approval_prompt', 'auto');

  return NextResponse.redirect(authUrl.toString());
}
