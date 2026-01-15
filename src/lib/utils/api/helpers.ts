import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { logger } from '@/lib/infrastructure/logger';

// ============================================================================
// SIMPLE RESPONSE HELPERS
// ============================================================================

/**
 * Creates a JSON error response with the specified message and status code
 * @param message Error message to return
 * @param status HTTP status code (default: 400)
 * @returns NextResponse with error JSON
 */
export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Validates authentication and returns user ID or error response
 */
export async function validateAuth(request: NextRequest): Promise<string | NextResponse> {
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  
  return userId;
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Finds a session by ID and user ID
 */
export async function findSessionByIdAndUser(id: string, userId: string) {
  return prisma.training_sessions.findFirst({
    where: { id, userId },
  });
}

// ============================================================================
// ERROR HANDLERS
// ============================================================================

/**
 * Handles Zod validation errors
 */
export function handleZodError(error: ZodError) {
  return NextResponse.json(
    { 
      error: error.issues[0]?.message ?? 'Payload invalide',
      details: error.issues,
    },
    { status: 400 }
  );
}

/**
 * Handles not found errors
 */
export function handleNotFound(message = 'Ressource introuvable') {
  return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Handles server errors with logging
 */
export function handleServerError(error: unknown, context: Record<string, unknown>) {
  logger.error({ error, ...context }, 'API error');
  return NextResponse.json(
    { error: 'Erreur interne du serveur' },
    { status: 500 }
  );
}

// ============================================================================
// ERROR HANDLING WRAPPER
// ============================================================================

/**
 * Wraps an async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: Record<string, unknown>
): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    return handleServerError(error, context);
  }
}
