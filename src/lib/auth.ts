import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'rt_session';
const ONE_WEEK = 60 * 60 * 24 * 7;

interface TokenPayload {
  userId: string;
}

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET n\'est pas configuré');
  }
  return secret;
};

export const createSessionToken = (userId: string) => {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
};

export const verifySessionToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
};

export const persistSessionCookie = async (token: string) => {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_WEEK,
  });
};

export const clearSessionCookie = async () => {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
};

export const extractTokenFromRequest = (request: NextRequest) => {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
};

export const getUserIdFromRequest = (request: NextRequest) => {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);
  return payload?.userId ?? null;
};

export { SESSION_COOKIE_NAME };

