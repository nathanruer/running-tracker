import { describe, it, expect } from 'vitest';
import { AppError, isAppError, ErrorCode } from '../index';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with default values', () => {
      const error = new AppError({ code: ErrorCode.UNKNOWN });

      expect(error.code).toBe(ErrorCode.UNKNOWN);
      expect(error.userMessage).toBe('Une erreur inattendue est survenue.');
      expect(error.severity).toBe('error');
      expect(error.isRecoverable).toBe(true);
    });

    it('should use custom message when provided', () => {
      const error = new AppError({
        code: ErrorCode.UNKNOWN,
        message: 'Custom message',
      });

      expect(error.userMessage).toBe('Custom message');
      expect(error.message).toBe('Custom message');
    });

    it('should set correct severity for critical errors', () => {
      const error = new AppError({ code: ErrorCode.AUTH_SESSION_EXPIRED });

      expect(error.severity).toBe('critical');
      expect(error.isRecoverable).toBe(false);
    });

    it('should set correct severity for warning errors', () => {
      const error = new AppError({ code: ErrorCode.STRAVA_RATE_LIMITED });

      expect(error.severity).toBe('warning');
      expect(error.isRecoverable).toBe(true);
    });

    it('should include statusCode and details when provided', () => {
      const error = new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        statusCode: 400,
        details: { field: 'email' },
      });

      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should use message from error code mapping', () => {
      const error = new AppError({ code: ErrorCode.AUTH_SESSION_EXPIRED });

      expect(error.userMessage).toBe('Votre session a expiré. Veuillez vous reconnecter.');
    });
  });

  describe('fromUnknown', () => {
    it('should return the same AppError if already an AppError', () => {
      const original = new AppError({ code: ErrorCode.NETWORK_TIMEOUT });
      const result = AppError.fromUnknown(original);

      expect(result).toBe(original);
    });

    it('should convert any non-AppError to UNKNOWN', () => {
      const regularError = new Error('Some error');
      const result = AppError.fromUnknown(regularError);

      expect(result.code).toBe(ErrorCode.UNKNOWN);
    });

    it('should handle null', () => {
      const result = AppError.fromUnknown(null);

      expect(result.code).toBe(ErrorCode.UNKNOWN);
    });

    it('should handle undefined', () => {
      const result = AppError.fromUnknown(undefined);

      expect(result.code).toBe(ErrorCode.UNKNOWN);
    });

    it('should handle string', () => {
      const result = AppError.fromUnknown('error string');

      expect(result.code).toBe(ErrorCode.UNKNOWN);
    });
  });

  describe('isBlockingError', () => {
    it('should return true for critical errors', () => {
      const error = new AppError({ code: ErrorCode.AUTH_SESSION_EXPIRED });
      expect(AppError.isBlockingError(error)).toBe(true);
    });

    it('should return false for unauthorized errors (handled inline)', () => {
      const error = new AppError({ code: ErrorCode.AUTH_UNAUTHORIZED });
      expect(AppError.isBlockingError(error)).toBe(false);
    });

    it('should return false for non-critical errors', () => {
      const error = new AppError({ code: ErrorCode.SESSION_SAVE_FAILED });
      expect(AppError.isBlockingError(error)).toBe(false);
    });

    it('should return false for warning errors', () => {
      const error = new AppError({ code: ErrorCode.STRAVA_RATE_LIMITED });
      expect(AppError.isBlockingError(error)).toBe(false);
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError({ code: ErrorCode.UNKNOWN });
      expect(isAppError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error');
      expect(isAppError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });
  });
});
