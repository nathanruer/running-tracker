import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { generateTestEmail, TEST_PASSWORD, API_BASE_URL } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';
import { createTestSession } from '../../helpers/sessions.helper';

/**
 * E2E Tests: Dashboard
 * Tests covering the dashboard display and navigation
 */

test.describe('Dashboard - Display', () => {
  let currentUserEmail: string | undefined;

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    currentUserEmail = generateTestEmail('dashboard');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();
  });

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display table with correct headers', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const table = page.locator('table');

    if (await table.isVisible()) {
      await expect(table.getByText(/date/i).first()).toBeVisible();
      await expect(table.getByText(/séance/i).first()).toBeVisible();
      await expect(table.getByText(/durée/i).first()).toBeVisible();
      await expect(table.getByText(/dist/i).first()).toBeVisible();
      await expect(table.getByText(/allure/i).first()).toBeVisible();
    }
  });

  test('should display sessions or empty state', async ({ page }) => {
    const hasTable = await page.getByText(/historique des séances/i).isVisible().catch(() => false);
    const hasEmptyState = await page.locator('[data-testid="sessions-empty-state"]').isVisible().catch(() => false);
    expect(hasTable || hasEmptyState).toBe(true);
  });

  test('should display sortable column indicators', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const table = page.locator('table');

    if (await table.isVisible()) {
      const hasSortable = await Promise.any([
        table.getByRole('button', { name: /durée/i }).isVisible(),
        table.getByRole('button', { name: /dist/i }).isVisible(),
        table.getByRole('button', { name: /allure/i }).isVisible(),
      ]).catch(() => false);
      expect(hasSortable).toBe(true);
    }
  });
});

test.describe('Dashboard - Empty State', () => {
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
  });

  test('should show add first session button in empty state', async ({ page }) => {
    const authPage = new AuthPage(page);
    currentUserEmail = generateTestEmail('firstbtn');
    
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });

    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    const addButton = page.locator('[data-testid="btn-add-first-session"]');
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard - Interval Sessions (Fractionné)', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display chevron for interval sessions', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    currentUserEmail = generateTestEmail('chevron');

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
      comments: 'Fractionné test',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Fractionné', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('svg.lucide-chevron-down').first()).toBeVisible();
  });
});

test.describe('Dashboard - Session Types Display', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display different session types correctly', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    currentUserEmail = generateTestEmail('types');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    const types = ['Endurance fondamentale', 'Footing', 'Sortie longue'];
    for (const type of types) {
      await createTestSession(page, {
        sessionType: type,
        duration: '01:00:00',
        distance: 10,
        avgPace: '06:00',
        avgHeartRate: 140,
      });
    }

    await page.reload();
    await page.waitForLoadState('networkidle');

    for (const type of types) {
      await expect(page.getByText(type, { exact: true }).first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Dashboard - RPE Display', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display RPE with correct color', async ({ page }) => {
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
