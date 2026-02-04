import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { ProfilePage } from '../../pages/profile.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../utils/cleanup.helper';

/**
 * E2E Tests: Authentication - Register Flow
 */

test.describe('Register Flow - Core', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display register form when switching from login', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.assertRegisterFormVisible();
    await authPage.assertCardDescription(/créez votre compte/i);
  });

  test('should successfully register and auto-login', async ({ page, context }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    
    currentUserEmail = generateTestEmail('register');
    const newUser = { email: currentUserEmail, password: TEST_PASSWORD };
    
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register(newUser);
    
    // Verify registration success
    await authPage.assertRegisterSuccessful();
    await dashboardPage.assertDashboardLoaded();

    // Verify session cookie exists
    const cookies = await context.cookies();
    expect(cookies.find(c => c.name === 'rt_session')).toBeDefined();
  });

  test('should show error when registering with existing email', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const profilePage = new ProfilePage(page);
    
    const existingEmail = generateTestEmail('existing');
    currentUserEmail = existingEmail;

    // Register first time
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: existingEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    // Logout
    await dashboardPage.goToProfile();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    // Try to register again with same email
    await authPage.switchToRegister();
    await authPage.register({ email: existingEmail, password: TEST_PASSWORD });
    await authPage.assertInlineErrorVisible(/déjà utilisé/i);
    expect(authPage.getCurrentUrl()).not.toContain('/dashboard');
  });

  test('should persist session after page reload', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    currentUserEmail = generateTestEmail('persist');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await page.reload();
    await dashboardPage.assertDashboardLoaded();
  });
});
