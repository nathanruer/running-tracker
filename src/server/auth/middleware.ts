import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from './index';
import { HTTP_STATUS } from '@/lib/constants';

export type AuthResult =
  | { success: true; userId: string }
  | { success: false; error: NextResponse };

/**
 * Middleware for checking user authentication
 * Returns userId if authenticated, or an error response
 *
 * @param request NextRequest object
 * @returns AuthResult with either userId or error response
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const auth = requireAuth(request);
 *   if (!auth.success) return auth.error;
 *
 *   const userId = auth.userId;
 *   // ... your logic
 * }
 */
export function requireAuth(request: NextRequest): AuthResult {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Non authentifié' },
        { status: HTTP_STATUS.UNAUTHORIZED }
      ),
    };
  }

  return {
    success: true,
    userId,
  };
}

/**
 * Optional authentication middleware
 * Returns userId if authenticated, or null if not authenticated (without error)
 *
 * @param request NextRequest object
 * @returns userId or null
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const userId = getOptionalAuth(request);
 *   // userId might be null, handle accordingly
 * }
 */
export function getOptionalAuth(request: NextRequest): string | null {
  return getUserIdFromRequest(request);
}
