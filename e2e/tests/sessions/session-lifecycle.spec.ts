import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { SessionFormPage } from '../../pages/session-form.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';
import { createTestSession } from '../../helpers/sessions.helper';

/**
 * E2E Tests: Session Lifecycle
 * Covers modification and deletion of sessions
 */

test.describe('Session Lifecycle - Edit & Delete', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should edit an existing session', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const formPage = new SessionFormPage(page);

    currentUserEmail = generateTestEmail('edit');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    const initialComment = `Original Session ${Date.now()}`;
    await createTestSession(page, {
      sessionType: 'Footing',
      duration: '00:30:00',
      distance: 5,
      avgPace: '06:00',
      comments: initialComment,
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row').filter({ hasText: 'Footing' }).first();
    await row.getByRole('button', { name: /actions/i }).click();
    await page.getByRole('menuitem', { name: /modifier/i }).click();

    await formPage.waitForOpen();

    const newComment = `Edited Session ${Date.now()}`;
    await formPage.selectSessionType('Sortie longue');
    await formPage.fillComments(newComment);
    await formPage.submit();
    await formPage.waitForClosed();

    await expect(page.getByText('Sortie longue').first()).toBeVisible();
    await expect(page.getByText(newComment).first()).toBeVisible();
    await expect(page.getByText('Footing')).not.toBeVisible();
    await expect(page.getByText(initialComment)).not.toBeVisible();
  });

  test('should delete a session with confirmation', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);

    currentUserEmail = generateTestEmail('delete');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    const comment = `To Delete ${Date.now()}`;
    await createTestSession(page, {
      sessionType: 'Footing',
      duration: '00:30:00',
      avgPace: '05:00',
      comments: comment,
    });
    await page.reload();
    await expect(page.getByText(comment)).toBeVisible();

    const row = page.getByRole('row').filter({ hasText: comment }).first();
    await row.getByRole('button', { name: /actions/i }).click();
    await page.getByRole('menuitem', { name: /supprimer/i }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await page.locator('[data-testid="delete-session-confirm"]').click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(comment)).not.toBeVisible();
    await expect(page.locator('[data-testid="sessions-empty-state"]')).toBeVisible();
  });
});
