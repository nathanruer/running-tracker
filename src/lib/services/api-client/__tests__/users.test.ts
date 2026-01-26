import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUser } from '../users';
import { apiRequest } from '../client';

vi.mock('../client', () => ({
  apiRequest: vi.fn(),
}));

describe('api-client/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateUser', () => {
    it('should update user and return user data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        weight: 75,
        age: 30,
      };

      vi.mocked(apiRequest).mockResolvedValue({ user: mockUser });

      const result = await updateUser({ weight: 75, age: 30 });

      expect(result).toEqual(mockUser);
      expect(apiRequest).toHaveBeenCalledWith('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ weight: 75, age: 30 }),
      });
    });

    it('should handle partial updates', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        weight: 80,
      };

      vi.mocked(apiRequest).mockResolvedValue({ user: mockUser });

      const result = await updateUser({ weight: 80 });

      expect(result).toEqual(mockUser);
      expect(apiRequest).toHaveBeenCalledWith('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ weight: 80 }),
      });
    });

    it('should propagate errors from apiRequest', async () => {
      vi.mocked(apiRequest).mockRejectedValue(new Error('Network error'));

      await expect(updateUser({ weight: 75 })).rejects.toThrow('Network error');
    });
  });
});
