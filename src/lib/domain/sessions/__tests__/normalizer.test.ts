import { describe, it, expect } from 'vitest';
import { normalizeSessions } from '../normalizer';

describe('normalizeSessions', () => {
  it('should normalize sessions with all fields present', () => {
    const rawSessions = [
      {
        date: new Date('2024-01-15'),
        sessionType: 'Footing',
        avgPace: '5:30',
        duration: '00:45:00',
        comments: 'Bonne séance',
        avgHeartRate: 145,
        perceivedExertion: 6,
        distance: 8.5,
      },
    ];

    const result = normalizeSessions(rawSessions);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: '2024-01-15',
      sessionType: 'Footing',
      avgPace: '5:30',
      duration: '00:45:00',
      comments: 'Bonne séance',
      avgHeartRate: 145,
      perceivedExertion: 6,
      distance: 8.5,
    });
  });

  it('should handle null/undefined values with defaults', () => {
    const rawSessions = [
      {
        date: null,
        sessionType: undefined,
        avgPace: null,
        duration: undefined,
        comments: null,
        avgHeartRate: null,
        perceivedExertion: undefined,
        distance: null,
      },
    ];

    const result = normalizeSessions(rawSessions);

    expect(result[0]).toEqual({
      date: '',
      sessionType: '',
      avgPace: '',
      duration: '',
      comments: '',
      avgHeartRate: 0,
      perceivedExertion: 0,
      distance: 0,
    });
  });

  it('should convert Date objects to ISO date strings', () => {
    const rawSessions = [
      {
        date: new Date('2024-06-20T14:30:00Z'),
        sessionType: 'Sortie longue',
      },
    ];

    const result = normalizeSessions(rawSessions);

    expect(result[0].date).toBe('2024-06-20');
  });

  it('should handle empty sessions array', () => {
    const result = normalizeSessions([]);
    expect(result).toEqual([]);
  });

  it('should normalize multiple sessions', () => {
    const rawSessions = [
      {
        date: new Date('2024-01-10'),
        sessionType: 'Footing',
        avgPace: '6:00',
        avgHeartRate: 140,
        distance: 10,
      },
      {
        date: new Date('2024-01-12'),
        sessionType: 'Fractionné',
        avgPace: '4:30',
        avgHeartRate: 165,
        distance: 8,
      },
    ];

    const result = normalizeSessions(rawSessions);

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2024-01-10');
    expect(result[1].date).toBe('2024-01-12');
  });

  it('should preserve extra fields from original session', () => {
    const rawSessions = [
      {
        id: '123',
        userId: 'user1',
        date: new Date('2024-01-15'),
        sessionType: 'Footing',
        extraField: 'test',
      },
    ];

    const result = normalizeSessions(rawSessions);

    expect(result[0]).toMatchObject({
      id: '123',
      userId: 'user1',
      extraField: 'test',
    });
  });
});
