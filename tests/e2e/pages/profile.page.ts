import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Profile Page Object
 * Encapsulates all interactions with the profile page
 */
export class ProfilePage extends BasePage {
  readonly pageHeading: Locator;
  readonly profileTab: Locator;
  readonly analyticsTab: Locator;
  readonly calendarTab: Locator;
  readonly logoutButton: Locator;
  readonly mobileLogoutButton: Locator;
  readonly logoutDialog: Locator;
  readonly logoutDialogTitle: Locator;
  readonly logoutConfirmButton: Locator;
  readonly logoutCancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = this.getByRole('heading', { name: /mon profil|profile/i });
    this.profileTab = this.page.locator('[data-testid="tab-profile"]');
    this.analyticsTab = this.page.locator('[data-testid="tab-analytics"]');
    this.calendarTab = this.page.locator('[data-testid="tab-history"]');
    this.logoutButton = this.page.locator('[data-testid="logout-desktop"]');
    this.mobileLogoutButton = this.page.locator('[data-testid="logout-mobile"]');
    this.logoutDialog = this.page.locator('[role="dialog"]');
    this.logoutDialogTitle = this.logoutDialog.getByRole('heading', { name: /déconnexion/i });
    this.logoutConfirmButton = this.page.locator('[data-testid="logout-confirm"]');
    this.logoutCancelButton = this.page.locator('[data-testid="logout-cancel"]');
  }

  async goto(): Promise<void> {
    await super.goto('/profile');
    await this.waitForPageLoad();
  }

  async assertProfileLoaded(): Promise<void> {
    await this.waitForUrl(/\/profile/);
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.profileTab).toBeVisible({ timeout: 10000 });
  }

  async clickLogoutButton(): Promise<void> {
    const isMobile = await this.page.viewportSize();
    if (isMobile && isMobile.width < 768) {
      await this.mobileLogoutButton.scrollIntoViewIfNeeded();
      await this.click(this.mobileLogoutButton);
    } else {
      await this.click(this.logoutButton);
    }
  }

  async assertLogoutDialogVisible(): Promise<void> {
    await expect(this.logoutDialog).toBeVisible();
    await expect(this.logoutDialogTitle).toBeVisible();
    await expect(this.logoutConfirmButton).toBeVisible();
    await expect(this.logoutCancelButton).toBeVisible();
  }

  async confirmLogout(): Promise<void> {
    await expect(this.logoutDialog).toBeVisible({ timeout: 5000 });
    await this.click(this.logoutConfirmButton);
  }

  async cancelLogout(): Promise<void> {
    await expect(this.logoutDialog).toBeVisible({ timeout: 5000 });
    await this.click(this.logoutCancelButton);
    await expect(this.logoutDialog).not.toBeVisible({ timeout: 5000 });
  }

  async logout(): Promise<void> {
    await this.clickLogoutButton();
    await this.confirmLogout();
    await this.waitForUrl(/^\/$/);
  }

  async goToAnalytics(): Promise<void> {
    await this.click(this.analyticsTab);
  }

  async goToCalendar(): Promise<void> {
    await this.click(this.calendarTab);
  }

  async goToProfile(): Promise<void> {
    await this.click(this.profileTab);
  }
}
