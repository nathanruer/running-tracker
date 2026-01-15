import { fetchWithTimeout } from '@/lib/utils/api/fetch';

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetchWithTimeout(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const parseBody = async () => {
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  };

  const data = await parseBody();

  if (!response.ok) {
    const errorData = data as { error?: string; details?: unknown } | null;
    const message = errorData?.error ?? 'Une erreur est survenue';
    const error = new Error(message) as Error & { details?: unknown };

    if (errorData?.details) {
      error.details = errorData.details;
    }

    throw error;
  }

  return (data ?? ({} as T)) as T;
}
