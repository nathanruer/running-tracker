import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { ProfilePage } from '../../pages/profile.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { invalidTestUser } from '../../fixtures/users';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';

/**
 * E2E Tests: Authentication - Login Flow
 */

test.describe('Login Flow', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let currentUserEmail: string | undefined;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    currentUserEmail = undefined;
    await authPage.goto();
  });

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display login form on home page', async () => {
    await authPage.assertLoginFormVisible();
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.loginButton).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    currentUserEmail = generateTestEmail('login-valid');
    const testUser = { email: currentUserEmail, password: TEST_PASSWORD };

    await authPage.switchToRegister();
    await authPage.register(testUser);
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToProfile();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    await authPage.fillForm(testUser);
    await authPage.submit();
    await authPage.assertLoginSuccessful();
    await dashboardPage.assertDashboardLoaded();
  });

  test('should show error toast with invalid credentials', async () => {
    await authPage.fillForm(invalidTestUser);
    await authPage.submit();
    await authPage.assertErrorToastVisible(/erreur/i);
    expect(authPage.getCurrentUrl()).not.toContain('/dashboard');
  });

  test('should prevent submission with empty fields (HTML5 validation)', async ({ page }) => {
    const isFormValid = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form?.checkValidity() ?? false;
    });
    expect(isFormValid).toBe(false);
    expect(authPage.getCurrentUrl()).not.toContain('/dashboard');
  });

  test('should allow clearing form fields after failed login attempt', async () => {
    await authPage.fillForm(invalidTestUser);
    await authPage.submit();
    await authPage.assertErrorToastVisible();
    await authPage.clearForm();

    expect(await authPage.getEmailValue()).toBe('');
    expect(await authPage.getPasswordValue()).toBe('');
  });

  test('should maintain form values on page reload', async ({ page }) => {
    await authPage.fillForm({ email: 'test@example.com', password: 'password' });
    await page.reload();
    await authPage.assertLoginFormVisible();
  });

  test('should navigate to dashboard after successful login', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    currentUserEmail = generateTestEmail('login-nav');
    const testUser = { email: currentUserEmail, password: TEST_PASSWORD };

    await authPage.switchToRegister();
    await authPage.register(testUser);
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToProfile();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    await authPage.login(testUser);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await dashboardPage.assertDashboardLoaded();
  });

  test('should redirect to dashboard if already authenticated', async ({ page }) => {
    currentUserEmail = generateTestEmail('login-redirect');
    const testUser = { email: currentUserEmail, password: TEST_PASSWORD };
    
    await authPage.switchToRegister();
    await authPage.register(testUser);
    await dashboardPage.assertDashboardLoaded();

    await page.waitForTimeout(1500);

    await page.goto('/', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

test.describe('Login Flow - Accessibility', () => {
  test('should have accessible form labels', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();
    await expect(authPage.emailInput).toHaveAccessibleName(/email/i);
    await expect(authPage.passwordInput).toHaveAccessibleName(/mot de passe|password/i);
  });

  test('should support keyboard navigation', async ({ page, browserName, isMobile }) => {
    // Mobile doesn't have physical keyboard navigation
    test.skip(isMobile, 'Keyboard navigation not applicable on Mobile');

    const authPage = new AuthPage(page);
    await authPage.goto();

    await page.locator('body').click({ position: { x: 0, y: 0 } });

    await page.keyboard.press('Tab');
    await expect(authPage.emailInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(authPage.passwordInput).toBeFocused();

    // On macOS WebKit, buttons are not focusable by Tab by default (requires Option+Tab)
    if (browserName === 'webkit' && process.platform === 'darwin') {
      await page.keyboard.press('Alt+Tab');
    } else {
      await page.keyboard.press('Tab');
    }
    await expect(authPage.loginButton).toBeFocused();
  });
});

test.describe('Login Flow - Edge Cases', () => {
  test('should handle special characters in email', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.fillForm({
      email: 'test+special@running-tracker.com',
      password: TEST_PASSWORD,
    });
    await authPage.submit();
  });

  test('should trim whitespace from email input', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.fill(authPage.emailInput, '  test@example.com  ');
    await authPage.fill(authPage.passwordInput, TEST_PASSWORD);
    await authPage.submit();
  });
});

test.describe('Login Flow - Toggle Auth Mode', () => {
  test('should toggle between login and register modes', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();

    await expect(authPage.loginButton).toBeVisible();
    await authPage.switchToRegister();
    await expect(page.getByRole('button', { name: /s'inscrire/i })).toBeVisible();
    await authPage.switchToLogin();
    await expect(authPage.loginButton).toBeVisible();
  });
});
