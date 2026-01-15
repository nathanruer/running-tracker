import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { ChatPage } from '../../pages/chat.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';

/**
 * E2E Tests: Chat Conversations
 * Tests conversation CRUD operations (create, list, rename, delete)
 */

test.describe('Chat Conversations - Core', () => {
  let currentUserEmail: string | undefined;

  // Longer timeout for AI-dependent tests
  test.setTimeout(120000);

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should display empty state for new user', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-empty');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();
    await chatPage.assertEmptyState();
  });

  test('should create a new conversation when sending first message', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-create');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();

    // Send a message to create a conversation
    await chatPage.sendMessage('Bonjour');

    // Wait for redirect to the new conversation (happens after AI responds)
    await page.waitForURL(/\/chat\/[a-z0-9-]+/, { timeout: 90000 });

    // Verify we're on a conversation page
    expect(page.url()).toMatch(/\/chat\/[a-z0-9-]+/);
  });

  test('should list conversation in sidebar after creation', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-list');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();

    // Send a message to create a conversation
    await chatPage.sendMessage('Hello test');
    await page.waitForURL(/\/chat\/[a-z0-9-]+/, { timeout: 90000 });

    // The sidebar should show the conversation with MessageSquare icon
    const conversationItem = page.locator('div').filter({ has: page.locator('svg.lucide-message-square') }).first();
    await expect(conversationItem).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Chat Conversations - Management', () => {
  let currentUserEmail: string | undefined;

  test.setTimeout(120000);

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should delete a conversation', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-delete');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();

    // Create a conversation
    await chatPage.sendMessage('To delete');
    await page.waitForURL(/\/chat\/[a-z0-9-]+/, { timeout: 90000 });

    // Find the conversation item and open dropdown menu
    const conversationItem = page.locator('div').filter({ has: page.locator('svg.lucide-message-square') }).first();
    await conversationItem.hover();

    // Click the more options button (MoreVertical icon)
    const moreButton = conversationItem.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    await moreButton.click();

    // Click delete in dropdown
    await page.getByRole('menuitem', { name: /supprimer/i }).click();

    // Should redirect to /chat after deletion
    await page.waitForURL(/\/chat$/, { timeout: 10000 });
  });

  test('should rename a conversation', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-rename');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();

    // Create a conversation
    await chatPage.sendMessage('Rename me');
    await page.waitForURL(/\/chat\/[a-z0-9-]+/, { timeout: 90000 });

    // Find the conversation item and open dropdown menu
    const conversationItem = page.locator('div').filter({ has: page.locator('svg.lucide-message-square') }).first();
    await conversationItem.hover();

    // Click the more options button
    const moreButton = conversationItem.locator('button').filter({ has: page.locator('svg.lucide-more-vertical') });
    await moreButton.click();

    // Click rename in dropdown
    await page.getByRole('menuitem', { name: /renommer/i }).click();

    // Fill in the dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const newTitle = 'Mon nouveau titre';
    await dialog.getByRole('textbox').fill(newTitle);
    await dialog.getByRole('button', { name: /renommer/i }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify the new title is displayed
    await expect(page.getByText(newTitle)).toBeVisible({ timeout: 5000 });
  });
});
