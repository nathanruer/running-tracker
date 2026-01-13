import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import type { TestUser } from '../fixtures/users';

/**
 * Auth Page Object
 * Handles login and registration flows
 */
export class AuthPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly toast: Locator;
  readonly toggleToRegisterButton: Locator;
  readonly toggleToLoginButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = this.page.locator('[data-testid="login-email"]');
    this.passwordInput = this.page.locator('[data-testid="login-password"]');
    this.submitButton = this.page.locator('[data-testid="login-submit"]');
    this.loginButton = this.page.locator('[data-testid="login-submit"]');
    this.registerButton = this.page.locator('[data-testid="login-submit"]');
    this.toast = this.page.locator('li[data-state="open"]');
    this.toggleToRegisterButton = this.page.locator('[data-testid="login-switch"]');
    this.toggleToLoginButton = this.page.locator('[data-testid="login-switch"]');
  }

  async goto(): Promise<void> {
    await super.goto('/');
    await this.waitForPageLoad();
  }

  async fillForm(user: TestUser): Promise<void> {
    await this.fill(this.emailInput, user.email);
    await this.fill(this.passwordInput, user.password);
  }

  async submit(): Promise<void> {
    await this.click(this.submitButton);
  }

  async login(user: TestUser): Promise<void> {
    await this.fillForm(user);
    await this.click(this.loginButton);
  }

  async register(user: TestUser): Promise<void> {
    await this.fillForm(user);
    await this.click(this.registerButton);
  }

  async switchToRegister(): Promise<void> {
    await this.click(this.toggleToRegisterButton);
    await expect(this.registerButton).toBeVisible({ timeout: 5000 });
  }

  async switchToLogin(): Promise<void> {
    await this.click(this.toggleToLoginButton);
    await expect(this.loginButton).toBeVisible({ timeout: 5000 });
  }

  async assertLoginFormVisible(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async assertRegisterFormVisible(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.registerButton).toBeVisible();
  }

  async assertLoginSuccessful(): Promise<void> {
    await this.waitForUrl(/\/dashboard/);
  }

  async assertRegisterSuccessful(): Promise<void> {
    await this.waitForUrl(/\/dashboard/);
  }

  async assertErrorToastVisible(message?: string | RegExp): Promise<void> {
    await expect(this.toast).toBeVisible({ timeout: 5000 });
    if (message) {
      await expect(this.toast).toContainText(message);
    }
  }

  async assertSuccessToastVisible(message?: string | RegExp): Promise<void> {
    await expect(this.toast).toBeVisible({ timeout: 5000 });
    if (message) {
      await expect(this.toast).toContainText(message);
    }
  }

  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  async getEmailValue(): Promise<string> {
    return await this.emailInput.inputValue();
  }

  async getPasswordValue(): Promise<string> {
    return await this.passwordInput.inputValue();
  }

  async assertCardDescription(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
