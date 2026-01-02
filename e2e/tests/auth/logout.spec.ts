import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { ProfilePage } from '../../pages/profile.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';

/**
 * E2E Tests: Authentication - Logout Flow
 */

test.describe('Logout Flow', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let profilePage: ProfilePage;
  let currentUserEmail: string;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    profilePage = new ProfilePage(page);

    currentUserEmail = generateTestEmail('logout');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();
  });

  test.afterEach(async ({ page }) => {
    await deleteCurrentUser(page, currentUserEmail);
  });

  test('should successfully logout from profile page', async ({ page }) => {
    await dashboardPage.goToProfile();
    await profilePage.assertProfileLoaded();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should clear authentication cookies on logout', async ({ page, context }) => {
    await dashboardPage.goToProfile();
    await profilePage.assertProfileLoaded();

    const cookiesBefore = await context.cookies();
    expect(cookiesBefore.find(c => c.name === 'rt_session')).toBeDefined();

    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    const cookiesAfter = await context.cookies();
    expect(cookiesAfter.find(c => c.name === 'rt_session')).toBeUndefined();
  });

  test('should not be able to access protected pages after logout', async ({ page }) => {
    await dashboardPage.goToProfile();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    await page.goto('/dashboard');
    await page.waitForURL('**/', { timeout: 10000 });
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should logout on first click (no need to click twice)', async ({ page, context }) => {
    await dashboardPage.goToProfile();
    await profilePage.assertProfileLoaded();

    const cookiesBefore = await context.cookies();
    expect(cookiesBefore.find(c => c.name === 'rt_session')).toBeDefined();

    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    const cookiesAfter = await context.cookies();
    expect(cookiesAfter.find(c => c.name === 'rt_session')).toBeUndefined();
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should show confirmation dialog before logout', async () => {
    await dashboardPage.goToProfile();
    await profilePage.assertProfileLoaded();
    await profilePage.clickLogoutButton();
    await profilePage.assertLogoutDialogVisible();
  });

  test('should cancel logout when clicking cancel button', async ({ page }) => {
    await dashboardPage.goToProfile();
    await profilePage.assertProfileLoaded();
    await profilePage.clickLogoutButton();
    await profilePage.cancelLogout();
    await expect(page).toHaveURL(/\/profile/, { timeout: 5000 });
    await profilePage.assertProfileLoaded();
  });
});

test.describe('Logout Flow - Session Persistence', () => {
  let currentUserEmail: string;

  test.afterEach(async ({ page }) => {
    await deleteCurrentUser(page, currentUserEmail);
  });

  test('should require re-login after logout and page reload', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const profilePage = new ProfilePage(page);

    currentUserEmail = generateTestEmail('persist');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToProfile();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    await page.reload();
    await expect(page.locator('#email')).toBeVisible();
  });

  test('should not restore session after logout even with page navigation', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const profilePage = new ProfilePage(page);

    currentUserEmail = generateTestEmail('nav');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToProfile();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    await page.goBack();
    await page.goto('/dashboard');
    await page.waitForURL('**/', { timeout: 10000 });
  });
});
