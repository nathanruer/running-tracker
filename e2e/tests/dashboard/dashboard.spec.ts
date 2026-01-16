import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';

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

    await dashboardPage.clickNewSession();
    const formDialog = page.locator('[role="dialog"]');
    await expect(formDialog).toBeVisible({ timeout: 10000 });

    await formDialog.locator('[data-testid="select-session-type"]').click();
    await page.getByRole('option', { name: /Footing/i }).click();
    await formDialog.locator('[data-testid="input-duration"]').fill('01:00:00');
    await formDialog.locator('[data-testid="input-distance"]').fill('10');
    await formDialog.locator('[data-testid="input-avgpace"]').fill('06:00');
    await formDialog.locator('[data-testid="input-avgheartrate"]').fill('140');
    await formDialog.locator('[data-testid="btn-session-submit"]').click();

    await expect(formDialog).not.toBeVisible({ timeout: 10000 });

    const table = page.locator('[data-testid="sessions-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });
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

    await dashboardPage.clickNewSession();
    const formDialog = page.locator('[role="dialog"]');
    await expect(formDialog).toBeVisible({ timeout: 10000 });

    await formDialog.locator('[data-testid="select-session-type"]').click();
    await page.getByRole('option', { name: /Fractionné/i }).click();
    await formDialog.locator('[data-testid="input-duration"]').fill('01:00:00');
    await formDialog.locator('[data-testid="input-distance"]').fill('12');
    await formDialog.locator('[data-testid="input-avgpace"]').fill('05:00');
    await formDialog.locator('[data-testid="input-avgheartrate"]').fill('165');
    await formDialog.locator('[data-testid="btn-session-submit"]').click();

    await expect(formDialog).not.toBeVisible({ timeout: 10000 });

    const table = page.locator('[data-testid="sessions-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table.getByText('Fractionné', { exact: true })).toBeVisible({ timeout: 15000 });
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

    await dashboardPage.clickNewSession();
    const formDialog = page.locator('[role="dialog"]');
    await expect(formDialog).toBeVisible({ timeout: 10000 });

    await formDialog.locator('[data-testid="select-session-type"]').click();
    await page.getByRole('option', { name: /Fractionné/i }).click();
    await formDialog.locator('[data-testid="input-duration"]').fill('01:00:00');
    await formDialog.locator('[data-testid="input-distance"]').fill('12');
    await formDialog.locator('[data-testid="input-avgpace"]').fill('05:00');
    await formDialog.locator('[data-testid="input-avgheartrate"]').fill('175');

    const rpeSlider = formDialog.locator('[data-testid="rpe-slider"]');
    if (await rpeSlider.isVisible()) {
      await rpeSlider.click();
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowRight');
      }
    }

    await formDialog.locator('[data-testid="btn-session-submit"]').click();
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });

    const table = page.locator('[data-testid="sessions-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table.getByText('Fractionné', { exact: true })).toBeVisible({ timeout: 15000 });
  });
});
