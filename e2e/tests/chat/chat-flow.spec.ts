import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { ChatPage } from '../../pages/chat.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../helpers/cleanup.helper';

/**
 * E2E Tests: Chat AI Flow
 * Tests AI interactions, recommendations, and session planning
 *
 * Note: These tests have longer timeouts due to AI response times
 */

test.describe('Chat AI Flow', () => {
  let currentUserEmail: string | undefined;

  // AI tests need longer timeouts (2 min)
  test.setTimeout(120000);

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should receive AI response after sending message', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-ai');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();

    // Send a simple greeting
    await chatPage.sendMessage('Bonjour !');

    // Wait for redirect (means AI has responded)
    await page.waitForURL(/\/chat\/[a-z0-9-]+/, { timeout: 90000 });

    // Verify we're on a conversation page (URL changed = AI responded)
    expect(page.url()).toMatch(/\/chat\/[a-z0-9-]+/);
  });

  test('should display recommendation cards when requesting a program', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-reco');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();

    // Request a training program - this should trigger recommendations
    await chatPage.sendMessage('Crée moi 2 séances de running pour cette semaine');

    // Wait for redirect (AI has responded)
    await page.waitForURL(/\/chat\/[a-z0-9-]+/, { timeout: 90000 });

    // Should display recommendation cards
    await expect(page.getByTestId('recommendation-card').first()).toBeVisible({ timeout: 30000 });
  });

  test('should add recommended session to planned sessions', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-accept');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();

    // Request a training session
    await chatPage.sendMessage('Programme moi une séance de footing');

    // Wait for AI response
    await page.waitForURL(/\/chat\/[a-z0-9-]+/, { timeout: 90000 });

    // Wait for recommendation card
    const recommendationCard = page.getByTestId('recommendation-card').first();
    await expect(recommendationCard).toBeVisible({ timeout: 30000 });

    // Accept the first recommendation
    const acceptButton = page.getByTestId('recommendation-accept').first();
    await acceptButton.click();

    // Verify it was accepted - the delete button should appear instead
    await expect(page.getByTestId('recommendation-delete').first()).toBeVisible({ timeout: 10000 });

    // Navigate to dashboard and verify session was added
    await page.goto('/dashboard');
    await dashboardPage.assertDashboardLoaded();

    // Should have at least one session now (the table should be visible, not empty state)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain conversation context in follow-up messages', async ({ page }) => {
    const authPage = new AuthPage(page);
    const dashboardPage = new DashboardPage(page);
    const chatPage = new ChatPage(page);

    currentUserEmail = generateTestEmail('chat-context');
    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await dashboardPage.assertDashboardLoaded();

    await dashboardPage.goToChat();
    await chatPage.assertChatLoaded();

    // First message
    await chatPage.sendMessage('Bonjour');
    await page.waitForURL(/\/chat\/[a-z0-9-]+/, { timeout: 90000 });

    // Wait for the chat input to be available again (AI responded)
    await expect(chatPage.chatInput).toBeEnabled({ timeout: 30000 });

    // Follow-up message
    await chatPage.sendMessage('Merci');

    // Wait for second response (button becomes enabled again)
    await expect(chatPage.sendButton).toBeEnabled({ timeout: 30000 });

    // Verify we're still on the same conversation
    expect(page.url()).toMatch(/\/chat\/[a-z0-9-]+/);
  });
});
