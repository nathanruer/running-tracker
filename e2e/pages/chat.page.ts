import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ChatPage extends BasePage {
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly newConversationButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.chatInput = this.page.getByTestId('chat-input');
    this.sendButton = this.page.getByTestId('chat-send-button');
    this.newConversationButton = this.page.getByTestId('btn-new-conversation');
    this.emptyState = this.page.getByText('Aucune conversation');
  }

  async goto(): Promise<void> {
    await super.goto('/chat');
    await this.waitForPageLoad();
    await this.chatInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async sendMessage(message: string): Promise<void> {
    await this.chatInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.chatInput.fill(message);
    await this.sendButton.click();
  }

  async waitForAssistantResponse(): Promise<void> {
    await this.page.waitForSelector('[data-testid="chat-send-button"] svg:not(.animate-spin)', {
      timeout: 30000,
    });
    await this.page.waitForTimeout(500);
  }

  getConversationItems(): Locator {
    return this.page.locator('[data-testid^="conversation-"]');
  }

  async assertConversationInSidebar(titleSubstring: string): Promise<void> {
    await expect(
      this.page.locator('[data-testid^="conversation-"]').filter({ hasText: titleSubstring })
    ).toBeVisible({ timeout: 15000 });
  }

  async assertUrlContainsConversationId(): Promise<void> {
    await expect(this.page).toHaveURL(/\/chat\/[a-zA-Z0-9-]+/, { timeout: 15000 });
  }

  async getConversationCount(): Promise<number> {
    return await this.page.locator('[data-testid^="conversation-"]').count();
  }

  async clickNewConversation(): Promise<void> {
    await this.newConversationButton.click();
    await this.chatInput.waitFor({ state: 'visible', timeout: 15000 });
  }
}
