export interface TrainingSession {
  id: string;
  sessionNumber: number;
  week: number;
  date: string;
  sessionType: string;
  duration: string;
  distance: number;
  avgPace: string;
  avgHeartRate: number;
  intervalStructure?: string;
  comments: string;
  userId: string;
}

export type TrainingSessionPayload = Omit<TrainingSession, 'id' | 'userId' | 'sessionNumber' | 'week'>;

export interface User {
  id: string;
  email: string;
  weight?: number | null;
  age?: number | null;
  maxHeartRate?: number | null;
  vma?: number | null;
  stravaId?: string | null;
  stravaTokenExpiresAt?: Date | null;
}

export interface UserUpdatePayload {
  email?: string;
  password?: string;
  weight?: number;
  age?: number;
  maxHeartRate?: number;
  vma?: number;
}

const apiRequest = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
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
};

export const registerUser = async (
  email: string,
  password: string,
): Promise<User> => {
  const data = await apiRequest<{ user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return data.user;
};

export const loginUser = async (
  email: string,
  password: string,
): Promise<User> => {
  const data = await apiRequest<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return data.user;
};

export const logoutUser = async (): Promise<void> => {
  await apiRequest('/api/auth/logout', {
    method: 'POST',
  });
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const data = await apiRequest<{ user: User }>('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
};

export const getSessions = async (
  limit?: number,
  offset?: number,
  type?: string,
): Promise<TrainingSession[]> => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  if (type && type !== 'all') params.append('type', type);

  const queryString = params.toString() ? `?${params.toString()}` : '';

  const data = await apiRequest<{ sessions: TrainingSession[] }>(
    `/api/sessions${queryString}`,
  );
  return data.sessions;
};

export const addSession = async (
  session: TrainingSessionPayload,
): Promise<TrainingSession> => {
  const data = await apiRequest<{ session: TrainingSession }>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });

  return data.session;
};

export const updateSession = async (
  id: string,
  updates: Partial<TrainingSessionPayload>,
): Promise<TrainingSession> => {
  const data = await apiRequest<{ session: TrainingSession }>(
    `/api/sessions/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    },
  );

  return data.session;
};

export const deleteSession = async (id: string): Promise<void> => {
  await apiRequest(`/api/sessions/${id}`, {
    method: 'DELETE',
  });
};

export const bulkImportSessions = async (
  sessions: TrainingSessionPayload[],
): Promise<{ count: number; message: string }> => {
  const data = await apiRequest<{ count: number; message: string }>(
    '/api/sessions/bulk',
    {
      method: 'POST',
      body: JSON.stringify({ sessions }),
    }
  );

  return data;
};
export const getSessionTypes = async (): Promise<string[]> => {
  const data = await apiRequest<{ types: string[] }>('/api/sessions/types');
  return data.types;
};

export const updateUser = async (updates: UserUpdatePayload): Promise<User> => {
  const data = await apiRequest<{ user: User }>('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  return data.user;
};


