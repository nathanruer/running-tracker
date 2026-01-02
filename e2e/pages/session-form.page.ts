import { expect, type Page, type Locator } from '@playwright/test';

/**
 * Session Form Page Object
 * Handles all interactions with the session creation/edit dialog
 */
export class SessionFormPage {
  private page: Page;
  private dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
  }

  async waitForOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 10000 });
  }

  async waitForClosed(): Promise<void> {
    await expect(this.dialog).not.toBeVisible({ timeout: 10000 });
  }

  async selectSessionType(type: string): Promise<void> {
    const typeButton = this.dialog.locator('[role="combobox"]').first();
    await typeButton.click();
    await this.page.waitForTimeout(300);
    await this.page.getByRole('option', { name: new RegExp(type, 'i') }).first().click();
    await this.page.waitForTimeout(300);
  }

  async fillDuration(value: string): Promise<void> {
    const input = this.dialog.getByRole('textbox', { name: /^durée \(hh:mm:ss\)$/i });
    await input.clear();
    await input.fill(value);
  }

  async fillDistance(value: string | number): Promise<void> {
    const input = this.dialog.getByLabel(/distance/i);
    await input.clear();
    await input.fill(value.toString());
  }

  async fillAvgPace(value: string): Promise<void> {
    const input = this.dialog.getByLabel(/allure/i);
    await input.clear();
    await input.fill(value);
  }

  async fillAvgHeartRate(value: string | number): Promise<void> {
    const input = this.dialog.getByLabel(/fc moy/i);
    await input.clear();
    await input.fill(value.toString());
  }

  async fillComments(value: string): Promise<void> {
    const input = this.dialog.getByLabel(/commentaires/i);
    await input.click();
    await input.fill(value);
  }

  async submit(): Promise<void> {
    await this.dialog.getByRole('button', { name: /enregistrer|ajouter|modifier/i }).click({ force: true });
  }

  async cancel(): Promise<void> {
    await this.dialog.getByRole('button', { name: /annuler/i }).click();
  }

  async getValidationErrors(): Promise<string[]> {
    const errors = await this.dialog.locator('[id$="-form-item-message"]').allTextContents();
    return errors.filter(e => e.trim() !== '');
  }

  async hasError(pattern: RegExp | string): Promise<boolean> {
    const errors = await this.getValidationErrors();
    return typeof pattern === 'string'
      ? errors.some(e => e.includes(pattern))
      : errors.some(e => pattern.test(e));
  }

  /**
   * Fill the complete session form
   */
  async fillForm(session: {
    sessionType?: string;
    duration: string;
    distance?: string | number;
    avgPace?: string;
    avgHeartRate?: string | number;
    comments?: string;
  }): Promise<void> {
    if (session.sessionType) {
      await this.selectSessionType(session.sessionType);
    }
    await this.fillDuration(session.duration);
    if (session.distance) {
      await this.fillDistance(session.distance);
    }
    if (session.avgPace) {
      await this.fillAvgPace(session.avgPace);
    }
    if (session.avgHeartRate) {
      await this.fillAvgHeartRate(session.avgHeartRate);
    }
    if (session.comments) {
      await this.fillComments(session.comments);
    }
  }

  /**
   * Create a session (fill form and submit)
   */
  async createSession(session: {
    sessionType?: string;
    duration: string;
    distance?: string | number;
    avgPace?: string;
    avgHeartRate?: string | number;
    comments?: string;
  }): Promise<void> {
    await this.waitForOpen();
    await this.fillForm(session);
    await this.submit();
  }
}
