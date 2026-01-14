import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Dashboard Page Object
 * Encapsulates all interactions with the dashboard page
 */
export class DashboardPage extends BasePage {
  readonly pageHeading: Locator;
  readonly sessionsTable: Locator;
  readonly newSessionButton: Locator;
  readonly profileLink: Locator;
  readonly chatLink: Locator;
  readonly logoutButton: Locator;
  readonly loadingSkeleton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = this.getByRole('heading', { name: /historique des séances|dashboard/i });
    this.sessionsTable = this.page.getByRole('table');
    this.newSessionButton = this.page.locator('[data-testid="btn-new-session"]');
    this.profileLink = this.page.locator('[data-testid="nav-profile"]');
    this.chatLink = this.page.locator('[data-testid="nav-chat"]');
    this.logoutButton = this.getByRole('button', { name: /déconnexion|logout/i });
    this.loadingSkeleton = this.page.locator('[data-loading="true"]');
  }

  async goto(): Promise<void> {
    await super.goto('/dashboard');
    await this.waitForPageLoad();
  }

  async assertDashboardLoaded(): Promise<void> {
    await this.waitForUrl(/\/dashboard/);
    await expect(this.page.locator('[data-testid="dashboard-container"]')).toBeVisible({ timeout: 15000 });
  }

  async assertSessionsTableVisible(): Promise<void> {
    await expect(this.sessionsTable).toBeVisible();
  }

  async assertNotLoading(): Promise<void> {
    await expect(this.loadingSkeleton).not.toBeVisible();
  }

  async clickNewSession(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    const addButton = this.page.locator('[data-testid="btn-new-session"], [data-testid="btn-add-first-session"]').first();
    await addButton.click();
  }

  async goToProfile(): Promise<void> {
    const viewport = await this.page.viewportSize();
    const isMobile = viewport && viewport.width < 768;

    if (isMobile) {
      const mobileProfileButton = this.page.locator('nav').getByRole('button', { name: /profil/i });
      await mobileProfileButton.click();
    } else {
      await this.click(this.profileLink);
    }
    await this.waitForUrl(/\/profile/);
    await this.page.waitForLoadState('networkidle');
  }

  async goToChat(): Promise<void> {
    await this.click(this.chatLink);
    await this.waitForUrl(/\/chat/);
  }

  async logout(): Promise<void> {
    await this.click(this.logoutButton);
    await this.waitForUrl(/^\/$/);
  }

  async getSessionCount(): Promise<number> {
    return await this.sessionsTable.locator('tbody tr').count();
  }

  async assertAuthenticated(): Promise<void> {
    await this.assertDashboardLoaded();
  }
}
