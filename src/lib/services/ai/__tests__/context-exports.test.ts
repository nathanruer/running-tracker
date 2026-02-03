import { describe, it, expect } from 'vitest';
import { buildProfileContext } from '../context';

describe('ai context exports', () => {
  it('should expose buildProfileContext from context entrypoint', () => {
    const result = buildProfileContext({ age: 30, maxHeartRate: 190, vma: 18.5, goal: 'Marathon' }, 12);
    expect(result).toContain('Profil');
    expect(result).toContain('Âge');
    expect(result).toContain('Fréquence cardiaque maximale');
    expect(result).toContain('VMA');
    expect(result).toContain('Objectif');
    expect(result).toContain('Prochain numéro de séance');
  });
});
