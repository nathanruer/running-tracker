import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompts';

describe('buildSystemPrompt', () => {
  it('should return a non-empty string', () => {
    const prompt = buildSystemPrompt();

    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('should contain JSON format instructions', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('JSON');
    expect(prompt).toContain('responseType');
  });

  it('should contain session types', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('Footing');
    expect(prompt).toContain('Sortie longue');
    expect(prompt).toContain('Fractionné');
    expect(prompt).toContain('Autre');
  });

  it('should contain interval structure instructions', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('interval_structure');
    expect(prompt).toContain('interval_details');
  });

  it('should contain workout types', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('VMA');
    expect(prompt).toContain('SEUIL');
    expect(prompt).toContain('TEMPO');
  });

  it('should contain step types', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('warmup');
    expect(prompt).toContain('effort');
    expect(prompt).toContain('recovery');
    expect(prompt).toContain('cooldown');
  });

  it('should contain 80/20 rule', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('80%');
    expect(prompt).toContain('20%');
  });

  it('should contain response format structure', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('recommended_sessions');
    expect(prompt).toContain('rationale');
    expect(prompt).toContain('session_type');
    expect(prompt).toContain('duration_min');
  });

  it('should contain target fields', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('target_pace_min_km');
    expect(prompt).toContain('target_hr_bpm');
    expect(prompt).toContain('target_rpe');
  });

  it('should contain planning logic rules', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('dimanche');
    expect(prompt).toContain('Mardi');
    expect(prompt).toContain('Mercredi');
  });
});
