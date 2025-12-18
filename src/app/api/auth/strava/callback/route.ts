import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest, createSessionToken } from '@/lib/auth';
import { logger } from '@/lib/infrastructure/logger';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      return NextResponse.redirect(
        new URL('/dashboard?error=strava_auth_failed', request.url)
      );
    }

    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !REDIRECT_URI) {
      logger.error({
        hasClientId: !!STRAVA_CLIENT_ID,
        hasClientSecret: !!STRAVA_CLIENT_SECRET,
        hasRedirectUri: !!REDIRECT_URI,
      }, 'Missing Strava OAuth configuration');
      return NextResponse.json(
        { error: 'Configuration Strava manquante' },
        { status: 500 }
      );
    }

    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      logger.error({
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
      }, 'Strava token exchange failed');
      throw new Error('Échec de l\'échange de code');
    }

    const tokenData = await tokenResponse.json();
    const {
      access_token,
      refresh_token,
      expires_at,
      athlete,
    } = tokenData;

    const currentUserId = getUserIdFromRequest(request);
    let currentUser = null;
    
    if (currentUserId) {
      currentUser = await prisma.users.findUnique({
        where: { id: currentUserId },
      });
    }

    let user;

    if (currentUser) {
      const stravaAlreadyLinked = await prisma.users.findFirst({
        where: { 
          stravaId: athlete.id.toString(),
          id: { not: currentUser.id }
        },
      });

      if (stravaAlreadyLinked) {
        logger.error({
          currentUserId: currentUser.id,
          stravaLinkedToUserId: stravaAlreadyLinked.id,
          stravaId: athlete.id.toString(),
        }, 'Strava account already linked to a different user');
        
        return NextResponse.redirect(
          new URL('/dashboard?error=strava_already_linked', request.url)
        );
      }

      user = await prisma.users.update({
        where: { id: currentUser.id },
        data: {
          stravaId: athlete.id.toString(),
          stravaAccessToken: access_token,
          stravaRefreshToken: refresh_token,
          stravaTokenExpiresAt: new Date(expires_at * 1000),
        },
      });
      logger.info({ userId: user.id, stravaId: athlete.id }, 'Successfully linked Strava to existing logged-in user');
    } else {
      user = await prisma.users.findUnique({
        where: { stravaId: athlete.id.toString() },
      });

      if (user) {
        user = await prisma.users.update({
          where: { id: user.id },
          data: {
            stravaAccessToken: access_token,
            stravaRefreshToken: refresh_token,
            stravaTokenExpiresAt: new Date(expires_at * 1000),
          },
        });
        logger.info({ userId: user.id }, 'Updated tokens for existing Strava user');
      } else {
        user = await prisma.users.create({
          data: {
            email: `strava_${athlete.id}@strava.local`,
            password: '',
            stravaId: athlete.id.toString(),
            stravaAccessToken: access_token,
            stravaRefreshToken: refresh_token,
            stravaTokenExpiresAt: new Date(expires_at * 1000),
          },
        });
        logger.info({ userId: user.id }, 'Created new user via Strava login');
      }
    }

    const token = createSessionToken(user.id);

    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
    );
    response.cookies.set('rt_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    logger.error({ error }, 'Strava OAuth callback failed');
    return NextResponse.redirect(
      new URL('/dashboard?error=strava_auth_failed', request.url)
    );
  }
}
