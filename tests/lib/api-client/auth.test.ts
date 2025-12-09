import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from '@/lib/services/api-client/auth';
import * as clientModule from '@/lib/services/api-client/client';

vi.mock('@/lib/services/api-client/client', () => ({
  apiRequest: vi.fn(),
}));

describe('Auth API', () => {
  const mockApiRequest = vi.mocked(clientModule.apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('registers a new user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockApiRequest.mockResolvedValue({ user: mockUser });

      const result = await registerUser('test@example.com', 'password123');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
      expect(result).toEqual(mockUser);
    });

    it('propagates errors from API', async () => {
      mockApiRequest.mockRejectedValue(new Error('Email déjà utilisé'));

      await expect(registerUser('existing@example.com', 'password')).rejects.toThrow('Email déjà utilisé');
    });
  });

  describe('loginUser', () => {
    it('logs in a user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockApiRequest.mockResolvedValue({ user: mockUser });

      const result = await loginUser('test@example.com', 'password123');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
      expect(result).toEqual(mockUser);
    });

    it('throws on invalid credentials', async () => {
      mockApiRequest.mockRejectedValue(new Error('Email ou mot de passe incorrect'));

      await expect(loginUser('wrong@example.com', 'wrongpassword')).rejects.toThrow('Email ou mot de passe incorrect');
    });
  });

  describe('logoutUser', () => {
    it('logs out the current user', async () => {
      mockApiRequest.mockResolvedValue({});

      await logoutUser();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('returns current user when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockApiRequest.mockResolvedValue({ user: mockUser });

      const result = await getCurrentUser();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('returns null when not authenticated', async () => {
      mockApiRequest.mockRejectedValue(new Error('Non authentifié'));

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });
});
