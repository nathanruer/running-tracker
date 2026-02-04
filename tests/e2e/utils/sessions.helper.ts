import { type Page } from '@playwright/test';
import { API_BASE_URL, defaultSessionData } from '../fixtures/test-data';

/**
 * Sessions Helper
 * API utilities for creating and managing sessions in tests
 */

/**
 * Creates a test session via API
 */
export async function createTestSession(
  page: Page,
  data: Partial<typeof defaultSessionData> & { date?: string; comments?: string }
): Promise<void> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const localDate = `${year}-${month}-${day}`;

  const payload = {
    ...defaultSessionData,
    date: data.date || localDate,
    ...data,
  };

  const response = await page.request.post(`${API_BASE_URL}/api/sessions`, { data: payload });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create session: ${response.status()} - ${body}`);
  }
}

/**
 * Delete all sessions for the current user
 */
export async function deleteAllSessions(page: Page): Promise<boolean> {
  try {
    const getResponse = await page.request.get(`${API_BASE_URL}/api/sessions`);
    if (!getResponse.ok()) return false;

    const data = await getResponse.json();
    const sessions = data.sessions || [];

    for (const session of sessions) {
      await page.request.delete(`${API_BASE_URL}/api/sessions/${session.id}`);
    }

    return true;
  } catch {
    return false;
  }
}
