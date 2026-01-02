import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { SessionFormPage } from '../../pages/session-form.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';

/**
 * E2E Tests: Session Form
 * Tests covering session creation and editing
 */

test.describe('Session Form - Validation', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let form: SessionFormPage;
  let currentUserEmail: string;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('form-val');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();
  });

  test.afterEach(async ({ page }) => {
    await deleteCurrentUser(page, currentUserEmail);
  });

  test('should have default session type', async ({ page }) => {
    await dashboardPage.clickNewSession();
    await form.waitForOpen();
    const typeSelect = page.locator('[role="combobox"]').first();
    await expect(typeSelect).toContainText('Footing');
  });

  test('should auto-calculate pace', async ({ page }) => {
    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.fillDuration('01:00:00');
    await form.fillDistance('10');

    const paceInput = page.getByLabel(/allure/i);
    await expect(paceInput).toHaveValue('06:00');

    await form.fillDuration('00:45:00');
    await expect(paceInput).toHaveValue('04:30');
  });

  test('should validate duration format', async ({ page }) => {
    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.selectSessionType('Footing');
    await form.fillDuration('invalid');
    await form.submit();
    await page.waitForTimeout(500);

    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should validate pace format', async ({ page }) => {
    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.selectSessionType('Footing');
    await form.fillDuration('01:00:00');
    await form.fillAvgPace('notapace');
    await form.submit();
    await page.waitForTimeout(500);

    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should accept valid formats', async ({ page }) => {
    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.selectSessionType('Footing');
    await form.fillDuration('01:30:00');
    await form.fillAvgPace('05:30');

    const durationInput = page.locator('[role="dialog"]').getByRole('textbox', { name: /^durée \(hh:mm:ss\)$/i });
    const paceInput = page.locator('[role="dialog"]').getByLabel(/allure/i);

    expect(await durationInput.inputValue()).toBe('01:30:00');
    expect(await paceInput.inputValue()).toBe('05:30');
  });
});

test.describe('Session Form - Create Session', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should create a basic session', async ({ page }) => {
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

  test('should create a fractionné session', async ({ page }) => {
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

  test('should support decimal distance values', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('decimal');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.fillForm({
      sessionType: 'Footing',
      duration: '00:45:00',
      distance: '7.85',
      avgPace: '05:44',
      avgHeartRate: '142',
      comments: `Decimal test ${Date.now()}`,
    });

    await form.submit();
    await form.waitForClosed();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Footing', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle very long comments', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('long');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.fillForm({
      sessionType: 'Sortie longue',
      duration: '02:00:00',
      distance: '22',
      avgPace: '05:27',
      avgHeartRate: '145',
      comments: 'A'.repeat(500) + ` - ${Date.now()}`,
    });

    await form.submit();
    await form.waitForClosed();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Sortie longue', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });


  test('should create a complex manual interval session', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('complex-frac');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();

    await form.fillForm({
      sessionType: 'Fractionné',
      duration: '00:45:00',
      distance: '8',
      avgPace: '05:37',
      avgHeartRate: '150',
      comments: 'Manuel Interval Test',
    });

    await page.getByText('Afficher les détails avancés').click();
    
    const addStepBtn = page.locator('button:has(svg.lucide-plus)');
    
    await addStepBtn.click();
    await addStepBtn.click();
    await addStepBtn.click();
    
    const stepTypeButtons = page.locator('[role="dialog"] button', { hasText: 'Échauffement' });
    await expect(stepTypeButtons).toHaveCount(3);

    await stepTypeButtons.nth(1).click();
    await page.getByRole('menuitem', { name: 'Effort' }).click();
    
    await expect(page.getByRole('button', { name: /effort 1/i })).toBeVisible();

    await form.submit();
    await form.waitForClosed();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Manuel Interval Test')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Fractionné', { exact: true })).toBeVisible();
  });

  test('should auto-calculate pace for interval step', async ({ page }) => {
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

    await form.selectSessionType('Fractionné');
    
    await page.getByText('Afficher les détails avancés').click();

    const addStepBtn = page.locator('button:has(svg.lucide-plus)');
    await addStepBtn.click();
    
    const durationInput = page.locator('input[name="steps.0.duration"]');
    const distanceInput = page.locator('input[name="steps.0.distance"]');
    const paceInput = page.locator('input[name="steps.0.pace"]');

    await durationInput.fill('00:10:00');
    await distanceInput.fill('2'); // 2km in 10min -> 5:00/km

    await distanceInput.blur();
    
    await expect(paceInput).toHaveValue('05:00');
  });
});

test.describe('Session Form - Session Type Switching', () => {
  let authPage: AuthPage;
  let dashboardPage: DashboardPage;
  let form: SessionFormPage;
  let currentUserEmail: string;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    dashboardPage = new DashboardPage(page);
    form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('types-sw');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();
  });

  test.afterEach(async ({ page }) => {
    await deleteCurrentUser(page, currentUserEmail);
  });

  test('should show interval fields when selecting Fractionné', async ({ page }) => {
    await dashboardPage.clickNewSession();
    await form.waitForOpen();
    await form.selectSessionType('Fractionné');
    await page.waitForTimeout(500);

    const hasIntervalContent = await page.locator('[role="dialog"]')
      .getByText(/type de fractionné|fractionné|répétitions|effort/i)
      .first().isVisible().catch(() => false);
    expect(hasIntervalContent).toBe(true);
    
    await expect(page.getByText('Importer les intervalles depuis CSV')).toBeVisible();
    await expect(page.locator('.border-dashed button', { hasText: 'Importer CSV' })).toBeVisible();
  });

  test('should hide interval fields when switching from Fractionné', async ({ page }) => {
    await dashboardPage.clickNewSession();
    await form.waitForOpen();
    await form.selectSessionType('Fractionné');
    await page.waitForTimeout(500);
    await form.selectSessionType('Footing');
    await page.waitForTimeout(500);

    const hasIntervalHeader = await page.locator('[role="dialog"]')
      .getByText(/importer un csv|structure du fractionné/i)
      .first().isVisible().catch(() => false);
    expect(hasIntervalHeader).toBe(false);
  });
});

test.describe('Session Form - Cancel & Reset', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
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

test.describe('Session Form - Complete Journey', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should create multiple sessions of different types', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const form = new SessionFormPage(page);
    currentUserEmail = generateTestEmail('journey');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.clickNewSession();
    await form.waitForOpen();
    await form.fillForm({ sessionType: 'Footing', duration: '00:45:00', distance: '8', avgPace: '05:37', avgHeartRate: '140' });
    await form.submit();
    await form.waitForClosed();
    await page.waitForTimeout(1000);

    await dashboardPage.clickNewSession();
    await form.waitForOpen();
    await form.fillForm({ sessionType: 'Fractionné', duration: '01:00:00', distance: '12', avgPace: '05:00', avgHeartRate: '165' });
    await form.submit();
    await form.waitForClosed();
    await page.waitForTimeout(1000);

    await dashboardPage.clickNewSession();
    await form.waitForOpen();
    await form.fillForm({ sessionType: 'Sortie longue', duration: '02:00:00', distance: '22', avgPace: '05:27', avgHeartRate: '142' });
    await form.submit();
    await form.waitForClosed();

    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Footing', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Fractionné', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Sortie longue', { exact: true }).first()).toBeVisible();

    const rows = page.locator('tbody tr');
    expect(await rows.count()).toBe(3);
  });
});
