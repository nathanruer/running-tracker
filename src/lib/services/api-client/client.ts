import { fetchWithTimeout } from '@/lib/utils/api/fetch';
import { AppError, ErrorCode } from '@/lib/errors';
import { HTTP_STATUS } from '@/lib/constants/http';
import { isAbortError } from '@/lib/utils/error';

function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case HTTP_STATUS.UNAUTHORIZED:
      return ErrorCode.AUTH_UNAUTHORIZED;
    case HTTP_STATUS.FORBIDDEN:
      return ErrorCode.AUTH_UNAUTHORIZED;
    case HTTP_STATUS.NOT_FOUND:
      return ErrorCode.SESSION_NOT_FOUND;
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      return ErrorCode.STRAVA_RATE_LIMITED;
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return ErrorCode.VALIDATION_FAILED;
    case HTTP_STATUS.GATEWAY_TIMEOUT:
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      return ErrorCode.NETWORK_SERVER_ERROR;
    default:
      return ErrorCode.UNKNOWN;
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs?: number,
): Promise<T> {
  let response: Response;

  try {
    response = await fetchWithTimeout(endpoint, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    }, timeoutMs);
  } catch (error) {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      throw new AppError({
        code: ErrorCode.NETWORK_OFFLINE,
        statusCode: 0,
      });
    }

    if (isAbortError(error)) {
      throw new AppError({
        code: ErrorCode.NETWORK_TIMEOUT,
        statusCode: 0,
      });
    }
    throw new AppError({
      code: ErrorCode.NETWORK_SERVER_ERROR,
      statusCode: 0,
    });
  }

  const parseBody = async () => {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  };

  const data = await parseBody();

  if (!response.ok) {
    const errorData = data as { error?: string; code?: string; details?: unknown } | null;
    const errorCode = (errorData?.code as ErrorCode) ?? getErrorCodeFromStatus(response.status);

    throw new AppError({
      code: errorCode,
      message: errorData?.error,
      statusCode: response.status,
      details: errorData?.details,
    });
  }

  return (data ?? ({} as T)) as T;
}
