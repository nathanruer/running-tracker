import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '@/lib/validation/auth';

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    it('validates correct email and password', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('rejects empty email', () => {
      const result = registerSchema.safeParse({
        email: '',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password too short (less than 6 characters)', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: '12345',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
      }
    });

    it('accepts password with exactly 6 characters', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing fields', () => {
      const result = registerSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('validates correct email and password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'a',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
      }
    });

    it('accepts any non-empty password (no min length)', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '1',
      });
      expect(result.success).toBe(true);
    });
  });
});
