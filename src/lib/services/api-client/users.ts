import type { User, UserUpdatePayload } from '@/lib/types';
import { apiRequest } from './client';

export async function updateUser(updates: UserUpdatePayload): Promise<User> {
  const data = await apiRequest<{ user: User }>('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  return data.user;
}
