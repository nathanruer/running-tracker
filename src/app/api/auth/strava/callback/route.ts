import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET!;

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

    logger.info({
      hasCode: !!code,
      error: error || 'none',
      clientId: STRAVA_CLIENT_ID,
      redirectUri: REDIRECT_URI,
    }, 'Strava OAuth callback received');

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

    const existingToken = request.cookies.get('token')?.value;
    let currentUser = null;
    
    if (existingToken) {
      try {
        const decoded = jwt.verify(existingToken, JWT_SECRET) as { userId: string };
        currentUser = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });
        logger.info({ currentUserId: currentUser?.id }, 'User already logged in, linking Strava to existing account');
      } catch (err) {
        logger.warn({ error: err }, 'Invalid existing token, proceeding with Strava login');
      }
    }

    let user = await prisma.user.findUnique({
      where: { stravaId: athlete.id.toString() },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          stravaAccessToken: access_token,
          stravaRefreshToken: refresh_token,
          stravaTokenExpiresAt: new Date(expires_at * 1000),
        },
      });
      logger.info({ userId: user.id }, 'Updated existing Strava-linked user');
    } else if (currentUser) {
      user = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          stravaId: athlete.id.toString(),
          stravaAccessToken: access_token,
          stravaRefreshToken: refresh_token,
          stravaTokenExpiresAt: new Date(expires_at * 1000),
        },
      });
      logger.info({ userId: user.id }, 'Linked Strava to existing logged-in user');
    } else {
      user = await prisma.user.create({
        data: {
          email: `strava_${athlete.id}@strava.local`,
          password: '',
          stravaId: athlete.id.toString(),
          stravaAccessToken: access_token,
          stravaRefreshToken: refresh_token,
          stravaTokenExpiresAt: new Date(expires_at * 1000),
        },
      });
      logger.info({ userId: user.id }, 'Created new Strava user');
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
    );
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    logger.error({ error }, 'Strava OAuth callback failed');
    return NextResponse.redirect(
      new URL('/dashboard?error=strava_auth_failed', request.url)
    );
  }
}
