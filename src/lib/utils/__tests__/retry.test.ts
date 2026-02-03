import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../retry';

describe('withRetry', () => {
  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 })
    ).rejects.toThrow('always fails');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('no retry'));

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        shouldRetry: () => false,
      })
    ).rejects.toThrow('no retry');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect custom shouldRetry function', async () => {
    const retryableError = { status: 500 };
    const nonRetryableError = { status: 429 };

    const fn = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(nonRetryableError);

    await expect(
      withRetry(fn, {
        maxAttempts: 5,
        baseDelayMs: 1,
        maxDelayMs: 5,
        shouldRetry: (err) => (err as { status: number }).status !== 429,
      })
    ).rejects.toEqual(nonRetryableError);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry multiple times before success', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
