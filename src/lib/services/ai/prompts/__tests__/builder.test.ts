import { describe, it, expect } from 'vitest';
import { buildDynamicPrompt } from '../builder';
import type { FetchedContext } from '../../data/fetcher';

describe('buildDynamicPrompt', () => {
  const mockProfile = {
    maxHeartRate: 185,
    vma: 14.5,
    age: 35,
    goal: 'Marathon en 3h30',
  };

  const mockContext: FetchedContext = {
    profile: mockProfile,
    sessions: [],
    currentWeekSessions: [],
    nextSessionNumber: 48,
  };

  it('should return recommendation prompt for recommendation_request intent', () => {
    const result = buildDynamicPrompt('recommendation_request', mockContext);

    expect(result.systemPrompt).toContain('coach expert');
    expect(result.systemPrompt).toContain('80/20');
    expect(result.systemPrompt).toContain('JSON');
    expect(result.systemPrompt).toContain('interval_structure');
    expect(result.requiresJson).toBe(true);
  });

  it('should return analysis prompt for data_analysis intent', () => {
    const result = buildDynamicPrompt('data_analysis', mockContext);

    expect(result.systemPrompt).toContain('donnees');
    expect(result.systemPrompt).toContain('progression');
    expect(result.requiresJson).toBe(false);
  });

  it('should return advice prompt for advice intent', () => {
    const result = buildDynamicPrompt('advice', mockContext);

    expect(result.systemPrompt).toContain('avis');
    expect(result.systemPrompt).toContain('coach');
    expect(result.requiresJson).toBe(false);
  });

  it('should return education prompt for education intent', () => {
    const result = buildDynamicPrompt('education', mockContext);

    expect(result.systemPrompt).toContain('question technique');
    expect(result.systemPrompt).toContain('running');
    expect(result.requiresJson).toBe(false);
  });

  it('should return discussion prompt for discussion intent', () => {
    const result = buildDynamicPrompt('discussion', mockContext);

    expect(result.systemPrompt).toContain('discuter');
    expect(result.systemPrompt).toContain('conversation');
    expect(result.requiresJson).toBe(false);
  });

  it('should return greeting prompt for greeting intent', () => {
    const result = buildDynamicPrompt('greeting', mockContext);

    expect(result.systemPrompt).toContain('salue');
    expect(result.requiresJson).toBe(false);
  });

  it('should include context message when profile is provided', () => {
    const result = buildDynamicPrompt('advice', mockContext);

    expect(result.contextMessage).not.toBeNull();
    expect(result.contextMessage).toContain('CONTEXTE UTILISATEUR');
  });

  it('should return null context message when no profile', () => {
    const emptyContext: FetchedContext = {};

    const result = buildDynamicPrompt('greeting', emptyContext);

    expect(result.contextMessage).toBeNull();
  });

  it('should include base personality in all prompts', () => {
    const intents = [
      'recommendation_request',
      'data_analysis',
      'advice',
      'education',
      'discussion',
      'greeting',
    ] as const;

    for (const intent of intents) {
      const result = buildDynamicPrompt(intent, mockContext);
      expect(result.systemPrompt).toContain('coach de running');
    }
  });
});
