interface HttpError {
  status: number;
  message?: string;
}

export function isHttpError(error: unknown): error is HttpError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as HttpError).status === 'number'
  );
}

export function getHttpStatus(error: unknown): number | null {
  if (isHttpError(error)) {
    return error.status;
  }
  return null;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
