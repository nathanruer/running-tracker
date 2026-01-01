import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { logger } from '@/lib/infrastructure/logger';
import { requireAuth } from '@/lib/auth/middleware';
import { HTTP_STATUS } from '@/lib/constants';

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  authErrorMessage?: string;
  logContext?: string;
}

/**
 * Generic API request handler with centralized error handling
 * Handles authentication, request validation, and error responses
 *
 * @template T Type of validated request data
 * @template R Type of response data
 * @param request NextRequest object
 * @param schema Zod schema for request validation
 * @param handler Function that processes the validated request
 * @param options Handler options
 * @returns NextResponse with success or error
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   return handleApiRequest(
 *     request,
 *     sessionSchema,
 *     async (data, userId) => {
 *       const session = await createSession(data, userId);
 *       return NextResponse.json({ session }, { status: 201 });
 *     },
 *     { logContext: 'create-session' }
 *   );
 * }
 */
export async function handleApiRequest<T = unknown>(
  request: NextRequest,
  schema: ZodSchema<T> | null,
  handler: (data: T, userId: string) => Promise<NextResponse>,
  options: ApiHandlerOptions = {}
): Promise<NextResponse> {
  const {
    requireAuth: needsAuth = true,
    authErrorMessage,
    logContext = 'api-request',
  } = options;

  try {
    let userId: string = '';
    if (needsAuth) {
      const auth = requireAuth(request);
      if (!auth.success) {
        if (authErrorMessage) {
          return NextResponse.json(
            { error: authErrorMessage },
            { status: HTTP_STATUS.UNAUTHORIZED }
          );
        }
        return auth.error;
      }
      userId = auth.userId;
    }

    let data: T;
    if (schema) {
      const body = await request.json();
      data = schema.parse(body);
    } else {
      data = {} as T;
    }

    return await handler(data, userId);
  } catch (error) {
    return handleApiError(error, logContext);
  }
}

/**
 * Handles API errors with appropriate HTTP status codes and logging
 *
 * @param error Error object
 * @param context Context for logging
 * @returns NextResponse with error details
 */
export function handleApiError(error: unknown, context: string = 'api-error'): NextResponse {
  if (error instanceof ZodError) {
    const firstError = error.issues[0];
    const message = firstError?.message ?? 'Payload invalide';

    logger.warn(
      { error: error.issues, context },
      'Validation error'
    );

    return NextResponse.json(
      { error: message, details: error.issues },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  if (error instanceof Error) {
    const errorWithStatus = error as Error & { statusCode?: number; status?: number };
    const statusCode = errorWithStatus.statusCode || errorWithStatus.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;

    logger.error({ error, context }, `Error in ${context}`);

    return NextResponse.json(
      { error: error.message },
      { status: statusCode }
    );
  }

  logger.error({ error, context }, `Unknown error in ${context}`);

  return NextResponse.json(
    { error: 'Erreur interne du serveur' },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  );
}

/**
 * Wrapper for GET requests without body validation
 *
 * @param request NextRequest object
 * @param handler Function that processes the request
 * @param options Handler options
 * @returns NextResponse
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   return handleGetRequest(request, async (userId) => {
 *     const sessions = await getSessions(userId);
 *     return NextResponse.json({ sessions });
 *   });
 * }
 */
export async function handleGetRequest(
  request: NextRequest,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>,
  options: ApiHandlerOptions = {}
): Promise<NextResponse> {
  const {
    requireAuth: needsAuth = true,
    logContext = 'get-request',
  } = options;

  try {
    let userId: string = '';
    if (needsAuth) {
      const auth = requireAuth(request);
      if (!auth.success) return auth.error;
      userId = auth.userId;
    }

    return await handler(userId, request);
  } catch (error) {
    return handleApiError(error, logContext);
  }
}

/**
 * Wrapper for DELETE requests without body validation
 *
 * @param request NextRequest object
 * @param handler Function that processes the request
 * @param options Handler options
 * @returns NextResponse
 */
export async function handleDeleteRequest(
  request: NextRequest,
  handler: (userId: string) => Promise<NextResponse>,
  options: ApiHandlerOptions = {}
): Promise<NextResponse> {
  const {
    requireAuth: needsAuth = true,
    logContext = 'delete-request',
  } = options;

  try {
    let userId: string = '';
    if (needsAuth) {
      const auth = requireAuth(request);
      if (!auth.success) return auth.error;
      userId = auth.userId;
    }

    return await handler(userId);
  } catch (error) {
    return handleApiError(error, logContext);
  }
}
