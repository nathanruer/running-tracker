import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { generateTestEmail, TEST_PASSWORD, API_BASE_URL } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';
import { createTestSession } from '../../helpers/sessions.helper';

/**
 * E2E Tests: Dashboard
 */

test.describe('Dashboard - Core Functionality', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should show empty state for new user', async ({ page }) => {
    const authPage = new AuthPage(page);
    currentUserEmail = generateTestEmail('empty');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });

    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Check empty state container and add button
    await expect(page.locator('[data-testid="sessions-empty-state"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="btn-add-first-session"]')).toBeVisible();
  });

  test('should display sessions table with correct structure', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    currentUserEmail = generateTestEmail('table');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    // Create a session to populate the table
    await createTestSession(page, {
      sessionType: 'Footing',
      duration: '01:00:00',
      distance: 10,
      avgPace: '06:00',
      avgHeartRate: 140,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check table structure
    const table = page.locator('table');
    await expect(table).toBeVisible();
    await expect(table.getByText(/date/i).first()).toBeVisible();
    await expect(table.getByText(/séance/i).first()).toBeVisible();
    await expect(table.getByText(/durée/i).first()).toBeVisible();
    await expect(table.getByText('Footing', { exact: true })).toBeVisible();
  });

  test('should display interval session with expandable details', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    currentUserEmail = generateTestEmail('interval');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await createTestSession(page, {
      sessionType: 'Fractionné',
      duration: '01:00:00',
      distance: 12,
      avgPace: '05:00',
      avgHeartRate: 165,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Fractionné', { exact: true })).toBeVisible({ timeout: 10000 });
    // Check for expandable chevron
    await expect(page.locator('svg.lucide-chevron-down').first()).toBeVisible();
  });

  test('should display RPE indicator', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    currentUserEmail = generateTestEmail('rpe');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    await page.request.post(`${API_BASE_URL}/api/sessions`, {
      data: {
        date: localDate,
        sessionType: 'Fractionné',
        duration: '01:00:00',
        distance: 12,
        avgPace: '05:00',
        avgHeartRate: 175,
        perceivedExertion: 9,
      },
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/9\/10/)).toBeVisible({ timeout: 10000 });
  });
});
