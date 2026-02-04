import type { Page } from '@playwright/test';
import { API_BASE_URL, TEST_PASSWORD } from '../fixtures/test-data';

/**
 * Test Data Cleanup Helper
 * Utilities to clean up test data created during E2E tests
 */

/**
 * Delete a test user and all their data via API
 * Uses a fresh request context to ensure cookies are properly handled
 */
export async function deleteCurrentUser(page: Page, email?: string): Promise<boolean> {
  if (!email) {
    return false;
  }

  const context = page.context();

  try {
    const loginResponse = await context.request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { email, password: TEST_PASSWORD }
    });

    if (!loginResponse.ok()) {
      console.warn(`[cleanup] Failed to login as ${email}: ${loginResponse.status()}`);
      return false;
    }

    const deleteResponse = await context.request.delete(`${API_BASE_URL}/api/auth/delete-account`);

    if (!deleteResponse.ok()) {
      console.warn(`[cleanup] Failed to delete ${email}: ${deleteResponse.status()}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[cleanup] Error deleting ${email}:`, error);
    return false;
  }
}

/**
 * Logout the current user via API
 */
export async function logout(page: Page): Promise<boolean> {
  try {
    const response = await page.request.post(`${API_BASE_URL}/api/auth/logout`);
    return response.ok();
  } catch {
    return false;
  }
}
