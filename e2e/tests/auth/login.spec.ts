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

test.describe('Login Flow - Core', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display login form on home page', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.assertLoginFormVisible();
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.loginButton).toBeVisible();
  });

  test('should successfully login and navigate to dashboard', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const profilePage = new ProfilePage(page);
    
    currentUserEmail = generateTestEmail('login');
    const testUser = { email: currentUserEmail, password: TEST_PASSWORD };

    // Register first
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register(testUser);
    await dashboardPage.assertDashboardLoaded();

    // Logout
    await dashboardPage.goToProfile();
    await profilePage.clickLogoutButton();
    await profilePage.confirmLogout();
    await page.waitForURL('**/', { timeout: 10000 });

    // Login again
    await authPage.login(testUser);
    await authPage.assertLoginSuccessful();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await dashboardPage.assertDashboardLoaded();
  });

  test('should show error toast with invalid credentials', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();
    await authPage.fillForm(invalidTestUser);
    await authPage.submit();
    await authPage.assertErrorToastVisible(/erreur/i);
    expect(authPage.getCurrentUrl()).not.toContain('/dashboard');
  });

  test('should redirect to dashboard if already authenticated', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    
    currentUserEmail = generateTestEmail('redirect');
    const testUser = { email: currentUserEmail, password: TEST_PASSWORD };
    
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register(testUser);
    await dashboardPage.assertDashboardLoaded();

    await page.waitForTimeout(1000);

    await page.goto('/', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

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

test.describe('Login Flow - Accessibility', () => {
  test('should have accessible form labels', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.goto();
    await expect(authPage.emailInput).toHaveAccessibleName(/email/i);
    await expect(authPage.passwordInput).toHaveAccessibleName(/mot de passe|password/i);
  });
});
