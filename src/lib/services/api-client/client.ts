export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(endpoint, {
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
    const message =
      (data as { error?: string } | null)?.error ?? 'Une erreur est survenue';
    throw new Error(message);
  }

  return (data ?? ({} as T)) as T;
}
