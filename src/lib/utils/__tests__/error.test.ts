import { describe, it, expect } from 'vitest';
import { isHttpError, getHttpStatus, isAbortError } from '../error';

describe('error utils', () => {
  it('detects http errors', () => {
    expect(isHttpError({ status: 404 })).toBe(true);
    expect(isHttpError({ status: '404' })).toBe(false);
    expect(isHttpError(null)).toBe(false);
  });

  it('gets http status or null', () => {
    expect(getHttpStatus({ status: 500 })).toBe(500);
    expect(getHttpStatus({ status: '500' })).toBeNull();
    expect(getHttpStatus('oops')).toBeNull();
  });

  it('detects abort errors', () => {
    const abortErr = new Error('Aborted');
    abortErr.name = 'AbortError';
    expect(isAbortError(abortErr)).toBe(true);
    expect(isAbortError(new Error('Other'))).toBe(false);
  });
});
