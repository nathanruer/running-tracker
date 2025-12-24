import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { logger } from '@/lib/infrastructure/logger';

export async function validateAuth(request: NextRequest): Promise<string | NextResponse> {
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  
  return userId;
}

export async function findSessionByIdAndUser(id: string, userId: string) {
  return prisma.training_sessions.findFirst({
    where: { id, userId },
  });
}

export function handleZodError(error: ZodError) {
  return NextResponse.json(
    { 
      error: error.issues[0]?.message ?? 'Payload invalide',
      details: error.issues,
    },
    { status: 400 }
  );
}

export function handleNotFound(message = 'Ressource introuvable') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function handleServerError(error: unknown, context: Record<string, unknown>) {
  logger.error({ error, ...context }, 'API error');
  return NextResponse.json(
    { error: 'Erreur interne du serveur' },
    { status: 500 }
  );
}

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
