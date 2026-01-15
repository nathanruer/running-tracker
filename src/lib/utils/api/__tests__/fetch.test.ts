import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout } from '../fetch';

describe('fetchWithTimeout', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('should call fetch with provided URL and options', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.mocked(global.fetch).mockResolvedValue(mockResponse);

    await fetchWithTimeout('https://example.com', { method: 'POST' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('should return response when fetch succeeds within timeout', async () => {
    const mockResponse = new Response('success');
    vi.mocked(global.fetch).mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout('https://example.com');
    expect(result).toBe(mockResponse);
  });

  it('should abort request on timeout', async () => {
    vi.mocked(global.fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise((resolve, reject) => {
             if (init?.signal) {
                 init.signal.addEventListener('abort', () => {
                     reject(new DOMException('Aborted', 'AbortError'));
                 });
             }
        });
    });

    const promise = fetchWithTimeout('https://example.com', {}, 1000);
    
    vi.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow('Aborted');
  });

  it('should clear timeout on success', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    vi.mocked(global.fetch).mockResolvedValue(new Response('ok'));

    await fetchWithTimeout('https://example.com', {}, 5000);

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should clear timeout on error', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    await expect(fetchWithTimeout('https://example.com')).rejects.toThrow('Network error');

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
