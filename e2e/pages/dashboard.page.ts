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
    this.newSessionButton = this.page.locator('button[title="Nouvelle séance"]');
    this.profileLink = this.page.locator('header').getByRole('button', { name: /profil/i });
    this.chatLink = this.page.locator('header').getByRole('button', { name: /coach/i });
    this.logoutButton = this.getByRole('button', { name: /déconnexion|logout/i });
    this.loadingSkeleton = this.page.locator('[data-loading="true"]');
  }

  async goto(): Promise<void> {
    await super.goto('/dashboard');
    await this.waitForPageLoad();
  }

  async assertDashboardLoaded(): Promise<void> {
    await this.waitForUrl(/\/dashboard/);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');

    try {
      await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
    } catch {
      await expect(this.page.getByText('Aucune séance enregistrée')).toBeVisible({ timeout: 10000 });
    }
  }

  async assertSessionsTableVisible(): Promise<void> {
    await expect(this.sessionsTable).toBeVisible();
  }

  async assertNotLoading(): Promise<void> {
    await expect(this.loadingSkeleton).not.toBeVisible();
  }

  async clickNewSession(): Promise<void> {
    await this.page.waitForLoadState('networkidle');

    const mainButton = this.page.locator('button[title="Nouvelle séance"]');
    const emptyStateButton = this.page.getByRole('button', { name: /ajouter.*première|première.*séance/i });

    const visibleButton = await Promise.race([
      mainButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => mainButton),
      emptyStateButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => emptyStateButton),
    ]).catch(() => null);

    if (visibleButton) {
      await visibleButton.click();
    } else if (await mainButton.isVisible()) {
      await mainButton.click();
    } else if (await emptyStateButton.isVisible()) {
      await emptyStateButton.click();
    } else {
      throw new Error('No "New Session" button found');
    }
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
