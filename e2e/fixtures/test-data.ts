/**
 * Test Data & Constants
 * Centralized test data for E2E tests
 */

export const TEST_PASSWORD = 'TestPassword123!';
export const API_BASE_URL = 'http://localhost:3000';

/**
 * Generate a unique email for test user isolation
 */
export function generateTestEmail(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@running-tracker.com`;
}

/**
 * Default session data for creating test sessions
 */
export const defaultSessionData = {
  sessionType: 'Footing',
  duration: '01:00:00',
  distance: 10,
  avgPace: '06:00',
  avgHeartRate: 140,
  perceivedExertion: 5,
  source: 'manual',
};
