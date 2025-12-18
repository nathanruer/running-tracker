import type { User } from '@/lib/types';
import { apiRequest } from './client';

export async function registerUser(
  email: string,
  password: string,
): Promise<User> {
  const data = await apiRequest<{ user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return data.user;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<User> {
  const data = await apiRequest<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return data.user;
}

export async function logoutUser(): Promise<void> {
  await apiRequest('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await apiRequest<{ user: User }>('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

export async function disconnectStrava(): Promise<{
  success: boolean;
  message: string;
}> {
  const data = await apiRequest<{
    success: boolean;
    message: string;
  }>('/api/auth/strava/disconnect', {
    method: 'POST',
  });

  return data;
}
