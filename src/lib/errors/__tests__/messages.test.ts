import { describe, it, expect } from 'vitest';
import {
  getErrorMessage,
  getBlockingErrorTitle,
  ERROR_MESSAGES_MAP,
  BLOCKING_ERROR_TITLES,
} from '../messages';
import { ErrorCode } from '../types';

describe('messages', () => {
  describe('ERROR_MESSAGES_MAP', () => {
    it('should have a message for each error code', () => {
      const errorCodes = Object.values(ErrorCode);
      for (const code of errorCodes) {
        expect(ERROR_MESSAGES_MAP[code]).toBeDefined();
        expect(typeof ERROR_MESSAGES_MAP[code]).toBe('string');
      }
    });
  });

  describe('getErrorMessage', () => {
    it('should return the correct message for known error codes', () => {
      expect(getErrorMessage(ErrorCode.AUTH_INVALID_CREDENTIALS)).toBe(
        'Email ou mot de passe incorrect.'
      );
      expect(getErrorMessage(ErrorCode.AUTH_SESSION_EXPIRED)).toBe(
        'Votre session a expiré. Veuillez vous reconnecter.'
      );
    });

    it('should return UNKNOWN message for unknown error codes', () => {
      // Cast to simulate an unknown error code
      const unknownCode = 'UNKNOWN_CODE' as ErrorCode;
      expect(getErrorMessage(unknownCode)).toBe(ERROR_MESSAGES_MAP[ErrorCode.UNKNOWN]);
    });
  });

  describe('BLOCKING_ERROR_TITLES', () => {
    it('should have a title for session expired', () => {
      expect(BLOCKING_ERROR_TITLES[ErrorCode.AUTH_SESSION_EXPIRED]).toBe('Session expirée');
    });
  });

  describe('getBlockingErrorTitle', () => {
    it('should return specific title for blocking error codes', () => {
      expect(getBlockingErrorTitle(ErrorCode.AUTH_SESSION_EXPIRED)).toBe('Session expirée');
    });

    it('should return default "Erreur" for error codes without specific title', () => {
      expect(getBlockingErrorTitle(ErrorCode.UNKNOWN)).toBe('Erreur');
      expect(getBlockingErrorTitle(ErrorCode.AUTH_UNAUTHORIZED)).toBe('Erreur');
      expect(getBlockingErrorTitle(ErrorCode.NETWORK_TIMEOUT)).toBe('Erreur');
    });
  });
});
