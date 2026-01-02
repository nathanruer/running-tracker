/**
 * Test user fixtures for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
}

export const validTestUser: TestUser = {
  email: 'test@running-tracker.com',
  password: 'TestPassword123!',
};

export const invalidTestUser: TestUser = {
  email: 'nonexistent@running-tracker.com',
  password: 'WrongPassword123!',
};
