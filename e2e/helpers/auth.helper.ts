import { type Page } from '@playwright/test';

/**
 * Authentication Helper
 * Reusable authentication utilities for E2E tests
 */
export class AuthHelper {
  /**
   * Check if user is currently authenticated
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  }

  /**
   * Clear authentication state (cookies, storage)
   */
  static async clearAuthState(page: Page): Promise<void> {
    await page.context().clearCookies();
    await page.context().clearPermissions();
  }
}
