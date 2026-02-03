import { describe, it, expect } from 'vitest';
import { HTTP_STATUS, isSuccessStatus, isClientError, isServerError } from '../http';

describe('http constants', () => {
  it('defines common status codes', () => {
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
  });

  it('detects success statuses', () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(299)).toBe(true);
    expect(isSuccessStatus(300)).toBe(false);
  });

  it('detects client errors', () => {
    expect(isClientError(400)).toBe(true);
    expect(isClientError(499)).toBe(true);
    expect(isClientError(500)).toBe(false);
  });

  it('detects server errors', () => {
    expect(isServerError(500)).toBe(true);
    expect(isServerError(599)).toBe(true);
    expect(isServerError(400)).toBe(false);
  });
});
