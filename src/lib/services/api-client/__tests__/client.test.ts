import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '@/lib/services/api-client/client';
import { ErrorCode } from '@/lib/errors';

describe('apiRequest', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('makes a GET request by default', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    await apiRequest('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('makes a POST request with body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const body = JSON.stringify({ email: 'test@example.com' });
    await apiRequest('/api/auth/login', {
      method: 'POST',
      body,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('returns parsed JSON data on success', async () => {
    const responseData = { user: { id: '123', email: 'test@example.com' } };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => responseData,
    });

    const result = await apiRequest<{ user: { id: string; email: string } }>('/api/auth/me');

    expect(result).toEqual(responseData);
  });

  it('throws error with message from response on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Email invalide' }),
    });

    await expect(apiRequest('/api/auth/login')).rejects.toThrow('Email invalide');
  });

  it('throws default error message when no error in response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await expect(apiRequest('/api/auth/login')).rejects.toThrow('Une erreur inattendue est survenue.');
  });

  it('handles JSON parse errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const result = await apiRequest('/api/test');
    expect(result).toEqual({});
  });

  it('includes custom headers in request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await apiRequest('/api/test', {
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      })
    );
  });

  it('handles DELETE request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await apiRequest('/api/sessions/123', {
      method: 'DELETE',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/123',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('handles PUT request with body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ session: { id: '123' } }),
    });

    const updates = JSON.stringify({ distance: 10 });
    await apiRequest('/api/sessions/123', {
      method: 'PUT',
      body: updates,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/123',
      expect.objectContaining({
        method: 'PUT',
        body: updates,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('throws NETWORK_TIMEOUT when request times out', async () => {
    mockFetch.mockRejectedValue(new Error('timeout'));

    try {
      await apiRequest('/api/test');
      throw new Error('Expected to throw');
    } catch (error) {
      const err = error as { code?: string };
      expect(err.code).toBe(ErrorCode.NETWORK_TIMEOUT);
    }
  });

  it('throws NETWORK_OFFLINE when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    mockFetch.mockRejectedValue(new Error('network'));

    try {
      await apiRequest('/api/test');
      throw new Error('Expected to throw');
    } catch (error) {
      const err = error as { code?: string };
      expect(err.code).toBe(ErrorCode.NETWORK_OFFLINE);
    }
  });

  it('maps status code to error code when response lacks code', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    try {
      await apiRequest('/api/test');
      throw new Error('Expected to throw');
    } catch (error) {
      const err = error as { code?: string };
      expect(err.code).toBe(ErrorCode.SESSION_NOT_FOUND);
    }
  });
});
