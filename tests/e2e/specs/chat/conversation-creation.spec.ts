import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/auth.page';
import { ChatPage } from '../../pages/chat.page';
import { generateTestEmail, TEST_PASSWORD } from '../../fixtures/test-data';
import { deleteCurrentUser } from '../../utils/cleanup.helper';

test.describe('Chat Conversation Creation', () => {
  let currentUserEmail: string | undefined;

  test.afterEach(async ({ page }) => {
    if (currentUserEmail) {
      await deleteCurrentUser(page, currentUserEmail);
    }
  });

  test('should create conversation, update sidebar, and redirect to conversation URL', async ({ page }) => {
    const authPage = new AuthPage(page);
    const chatPage = new ChatPage(page);
    currentUserEmail = generateTestEmail('chat-create');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await authPage.assertRegisterSuccessful();
    await page.getByTestId('dashboard-container').waitFor({ state: 'visible', timeout: 15000 });

    await chatPage.goto();

    const testMessage = `Test message ${Date.now()}`;
    await chatPage.sendMessage(testMessage);

    await chatPage.waitForAssistantResponse();

    await chatPage.assertUrlContainsConversationId();

    await chatPage.assertConversationInSidebar(testMessage.substring(0, 30));

    const count = await chatPage.getConversationCount();
    expect(count).toBe(1);
  });

  test('should show multiple conversations in sidebar without refresh', async ({ page }) => {
    const authPage = new AuthPage(page);
    const chatPage = new ChatPage(page);
    currentUserEmail = generateTestEmail('chat-multi');

    await authPage.goto();
    await authPage.switchToRegister();
    await authPage.register({ email: currentUserEmail, password: TEST_PASSWORD });
    await authPage.assertRegisterSuccessful();
    await page.getByTestId('dashboard-container').waitFor({ state: 'visible', timeout: 15000 });

    await chatPage.goto();

    const msg1 = `First ${Date.now()}`;
    await chatPage.sendMessage(msg1);
    await chatPage.waitForAssistantResponse();
    await chatPage.assertUrlContainsConversationId();

    await page.goto('/chat');
    await chatPage.chatInput.waitFor({ state: 'visible', timeout: 15000 });

    const msg2 = `Second ${Date.now()}`;
    await chatPage.sendMessage(msg2);
    await chatPage.waitForAssistantResponse();

    const count = await chatPage.getConversationCount();
    expect(count).toBe(2);
  });
});
