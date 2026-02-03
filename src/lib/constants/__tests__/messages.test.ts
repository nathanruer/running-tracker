import { describe, it, expect } from 'vitest';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, VALIDATION_MESSAGES, getBulkDeleteMessage, getImportSuccessMessage } from '../messages';

describe('messages', () => {
  it('exposes error, success, and validation messages', () => {
    expect(ERROR_MESSAGES.GENERIC).toBeDefined();
    expect(SUCCESS_MESSAGES.SESSION_CREATED).toBeDefined();
    expect(VALIDATION_MESSAGES.DURATION_REQUIRED).toBeDefined();
  });

  it('builds bulk delete message for singular and plural', () => {
    expect(getBulkDeleteMessage(1)).toBe('1 séance a été supprimée avec succès.');
    expect(getBulkDeleteMessage(2)).toBe('2 séances ont été supprimées avec succès.');
  });

  it('builds import success message', () => {
    expect(getImportSuccessMessage(3)).toBe('3 séance(s) importée(s) avec succès.');
  });
});
