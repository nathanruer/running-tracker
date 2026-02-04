import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { SessionFormPage } from '../../pages/session-form.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../utils/cleanup.helper';

/**
 * E2E Tests: Session Form
 */

test.describe('Session Form - Core Functionality', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should create a basic session with all fields', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('create');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    const comment = `E2E Session ${Date.now()}`;
    await form.fillForm({
      sessionType: 'Footing',
      duration: '00:45:00',
      distance: '8',
      avgPace: '05:37',
      avgHeartRate: '140',
      comments: comment,
    });

    await form.submit();
    await form.waitForClosed();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(comment)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Footing', { exact: true })).toBeVisible();
  });

  test('should auto-calculate pace when duration and distance are filled', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('pace-calc');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.fillDuration('01:00:00');
    await form.fillDistance('10');

    const paceInput = page.getByLabel(/allure/i);
    await expect(paceInput).toHaveValue('06:00');
  });

  test('should create an interval (fractionné) session', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('frac');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.fillForm({
      sessionType: 'Fractionné',
      duration: '01:00:00',
      distance: '12',
      avgPace: '05:00',
      avgHeartRate: '165',
      comments: 'Fractionné E2E',
    });

    await form.submit();
    await form.waitForClosed();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Fractionné', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should show interval fields when selecting Fractionné type', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('frac-fields');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();
    await form.selectSessionType('Fractionné');

    await expect(page.getByLabel(/nombre de répétitions/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Effort' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Récupération' })).toBeVisible();
  });

  test('should reset form when cancelled and reopened', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('cancel');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();
    await form.selectSessionType('Footing');
    await form.fillDuration('01:00:00');
    await form.fillComments('Should be cleared');

    await form.cancel();
    await form.waitForClosed();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    const comments = await page.locator('[role="dialog"]').getByLabel(/commentaires/i).inputValue();
    expect(comments).toBe('');
  });
});
