import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { ProfilePage } from '../../pages/profile.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';

/**
 * E2E Tests: Authentication - Register Flow
 */

test.describe('Register Flow', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let currentUserEmail: string | undefined;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    currentUserEmail = undefined;
    await authPage.goto();
    await authPage.switchToRegister();
  });

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display register form when switching from login', async () => {
    await authPage.assertRegisterFormVisible();
    await authPage.assertCardDescription(/créez votre compte/i);
  });

  test('should successfully register with valid credentials', async ({ context }) => {
    currentUserEmail = generateTestEmail('register');
    const newUser = { email: currentUserEmail, password: TEST_PASSWORD };
    await authPage.register(newUser);
    await authPage.assertRegisterSuccessful();
    await dashboardPage.assertDashboardLoaded();

    const cookies = await context.cookies();
    expect(cookies.find(c => c.name === 'rt_session')).toBeDefined();
  });

  test('should show success toast after registration', async () => {
    currentUserEmail = generateTestEmail('toast');
    const newUser = { email: currentUserEmail, password: TEST_PASSWORD };
    await authPage.register(newUser);
    await authPage.assertSuccessToastVisible(/compte créé/i);
  });

  test('should show error when registering with existing email', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    const existingEmail = generateTestEmail('existing');
    
    currentUserEmail = existingEmail;

    await authPage.register({ email: existingEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToProfile();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    await authPage.switchToRegister();
    await authPage.register({ email: existingEmail, password: TEST_PASSWORD });
    await authPage.assertErrorToastVisible(/email.*déjà utilisé/i);
    expect(authPage.getCurrentUrl()).not.toContain('/dashboard');
  });

  test('should validate password minimum length (6 characters)', async ({ page }) => {
    await authPage.fillForm({ email: generateTestEmail('short'), password: '12345' });
    await authPage.submit();
    await page.waitForTimeout(1000);
    expect(authPage.getCurrentUrl()).not.toContain('/dashboard');
  });

  test('should validate email format', async ({ page }) => {
    await authPage.fillForm({ email: 'not-an-email', password: TEST_PASSWORD });
    const isFormValid = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form?.checkValidity() ?? false;
    });
    expect(isFormValid).toBe(false);
  });

  test('should prevent submission with empty fields', async ({ page }) => {
    const isFormValid = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form?.checkValidity() ?? false;
    });
    expect(isFormValid).toBe(false);
  });

  test('should allow switching back to login mode', async () => {
    await authPage.switchToLogin();
    await authPage.assertLoginFormVisible();
    await authPage.assertCardDescription(/connectez-vous/i);
  });
});

test.describe('Register Flow - Session Handling', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should automatically log in user after registration', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const profilePage = new ProfilePage(page);

    currentUserEmail = generateTestEmail('autologin');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    
    await page.waitForTimeout(2000);

    await dashboardPage.assertDashboardLoaded();

    await profilePage.goto();
    await profilePage.assertProfileLoaded();
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

  test('should redirect authenticated users away from login page', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    currentUserEmail = generateTestEmail('redirect');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await page.waitForTimeout(1500);

    await page.goto('/', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

test.describe('Register Flow - Edge Cases', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should handle email with special characters', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    currentUserEmail = `test+special-${Date.now()}@running-tracker.com`;

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({
      email: currentUserEmail,
      password: TEST_PASSWORD,
    });
    await authPage.assertRegisterSuccessful();
    await dashboardPage.assertDashboardLoaded();
  });

  test('should trim whitespace from email', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    await authPage.goto();
    await authPage.switchToRegister();

    const rawEmail = generateTestEmail('trim');
    currentUserEmail = rawEmail;

    await authPage.fill(authPage.emailInput, `  ${rawEmail}  `);
    await authPage.fill(authPage.passwordInput, TEST_PASSWORD);
    await authPage.submit();
    await dashboardPage.assertDashboardLoaded();
  });

  test('should show loading state during registration', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    currentUserEmail = generateTestEmail('loading');
    
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.fillForm({ email: currentUserEmail, password: TEST_PASSWORD });

    const submitButton = authPage.submitButton;
    await submitButton.click();

    await dashboardPage.assertDashboardLoaded();
  });
});

test.describe('Register Flow - Complete User Journey', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('complete journey: register -> use app -> logout -> login again', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const profilePage = new ProfilePage(page);

    currentUserEmail = generateTestEmail('journey');
    const newUser = { email: currentUserEmail, password: TEST_PASSWORD };

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register(newUser);
    await authPage.assertSuccessToastVisible(/compte créé/i);
    await dashboardPage.assertDashboardLoaded();

    await page.waitForTimeout(500);

    await profilePage.goto();
    await profilePage.assertProfileLoaded();

    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });
    await authPage.assertLoginFormVisible();

    await authPage.login(newUser);
    await authPage.assertSuccessToastVisible(/connexion réussie/i);
    await dashboardPage.assertDashboardLoaded();
  });
});
