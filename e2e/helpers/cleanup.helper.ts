import { type Page } from '@playwright/test';
import { API_BASE_URL, TEST_PASSWORD } from '../fixtures/test-data';

/**
 * Test Data Cleanup Helper
 * Utilities to clean up test data created during E2E tests
 */

/**
 * Delete a test user and all their data via API
 * If email is provided, attempts to re-login if the first delete attempt fails (e.g. user logged out)
 */
export async function deleteCurrentUser(page: Page, email?: string): Promise<boolean> {
  try {
    let response = await page.request.delete(`${API_BASE_URL}/api/auth/delete-account`);
    
    if (response.status() === 401 && email) {
      const loginResponse = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email, password: TEST_PASSWORD }
      });
      
      if (loginResponse.ok()) {
        response = await page.request.delete(`${API_BASE_URL}/api/auth/delete-account`);
      } else {
        console.error(`Failed to re-login for cleanup: ${loginResponse.status()}`);
        return false;
      }
    }

    return response.ok();
  } catch (error) {
    console.error('Error during user cleanup:', error);
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
