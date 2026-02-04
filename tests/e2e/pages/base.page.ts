import { type Page, type Locator } from '@playwright/test';

/**
 * Base Page Object
 * All page objects should extend this class for common functionality
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'networkidle' });
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  getByRole(
    role: 'button' | 'link' | 'textbox' | 'heading' | 'alert' | 'navigation',
    options?: { name?: string | RegExp }
  ): Locator {
    return this.page.getByRole(role, options);
  }

  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  getByPlaceholder(text: string | RegExp): Locator {
    return this.page.getByPlaceholder(text);
  }

  getByLabel(text: string | RegExp): Locator {
    return this.page.getByLabel(text);
  }

  async fill(selector: Locator, value: string): Promise<void> {
    await selector.fill(value);
  }

  async click(selector: Locator): Promise<void> {
    await selector.click();
  }

  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  async waitForUrl(url: string | RegExp): Promise<void> {
    await this.page.waitForURL(url);
  }

  async isVisible(selector: Locator): Promise<boolean> {
    return await selector.isVisible();
  }

  async waitForVisible(selector: Locator): Promise<void> {
    await selector.waitFor({ state: 'visible' });
  }
}
