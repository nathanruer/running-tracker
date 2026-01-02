import { type Page } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { DashboardPage } from '../pages/dashboard.page';
import { generateTestEmail, TEST_PASSWORD } from '../fixtures/test-data';
import { deleteCurrentUser } from './cleanup.helper';

/**
 * Test Setup Helper
 * Common setup patterns for E2E tests
 */

export interface TestContext {
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  userEmail: string;
}

/**
 * Register a new test user and navigate to dashboard
 * Returns the context with page objects and user email
 */
export async function setupAuthenticatedUser(
  page: Page,
  emailPrefix = 'test'
): Promise<TestContext> {
  const authPage = new AuthPage(page);
  const dashboardPage = new DashboardPage(page);
  const userEmail = generateTestEmail(emailPrefix);

  await authPage.goto();
  await authPage.switchToRegister();
  await authPage.register({ email: userEmail, password: TEST_PASSWORD });
  await dashboardPage.assertDashboardLoaded();

  return { authPage, dashboardPage, userEmail };
}

/**
 * Cleanup function to delete current user after test
 */
export async function cleanupTestUser(page: Page): Promise<void> {
  await deleteCurrentUser(page);
}
