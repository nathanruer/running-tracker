import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAndFixRecommendations } from '../validator';
import type { AIResponse, AIRecommendedSession } from '@/lib/types/ai';

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe('validateAndFixRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return conversation responses unchanged', () => {
    const response: AIResponse = {
      responseType: 'conversation',
      message: 'Hello',
    };

    const result = validateAndFixRecommendations(response);

    expect(result).toEqual(response);
  });

  it('should add recommendation_id to each session', () => {
    const response: AIResponse = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          target_pace_min_km: '5:30',
          duration_min: 60,
          estimated_distance_km: 10.9,
        },
      ],
    };

    const result = validateAndFixRecommendations(response);

    expect(result.responseType).toBe('recommendations');
    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0]).toHaveProperty('recommendation_id');
      expect(typeof result.recommended_sessions[0].recommendation_id).toBe('string');
    }
  });

  it('should correct distance when off by more than 5%', () => {
    const response: AIResponse = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          target_pace_min_km: '6:00',
          duration_min: 60,
          estimated_distance_km: 15,
        },
      ],
    };

    const result = validateAndFixRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0].estimated_distance_km).toBe(10);
    }
  });

  it('should NOT correct distance when within 5% tolerance', () => {
    const response: AIResponse = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          target_pace_min_km: '5:30',
          duration_min: 60,
          estimated_distance_km: 10.9,
        },
      ],
    };

    const result = validateAndFixRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0].estimated_distance_km).toBe(10.9);
    }
  });

  it('should handle pace with seconds correctly', () => {
    const response: AIResponse = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          target_pace_min_km: '7:30',
          duration_min: 60,
          estimated_distance_km: 10,
        },
      ],
    };

    const result = validateAndFixRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0].estimated_distance_km).toBe(8);
    }
  });

  it('should handle sessions with missing required fields', () => {
    const response: AIResponse = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          // Missing required fields
          duration_min: 60,
        } as unknown as AIRecommendedSession,
      ],
    };

    const result = validateAndFixRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0]).toHaveProperty('recommendation_id');
    }
  });

  it('should handle invalid pace format', () => {
    const response: AIResponse = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          target_pace_min_km: 'invalid',
          duration_min: 60,
          estimated_distance_km: 10,
        },
      ],
    };

    const result = validateAndFixRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0]).toHaveProperty('recommendation_id');
      expect(result.recommended_sessions[0].estimated_distance_km).toBe(10);
    }
  });

  it('should process multiple recommendations', () => {
    const response: AIResponse = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          target_pace_min_km: '5:00',
          duration_min: 50,
          estimated_distance_km: 10,
        },
        {
          target_pace_min_km: '6:00',
          duration_min: 60,
          estimated_distance_km: 10,
        },
      ],
    };

    const result = validateAndFixRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions).toHaveLength(2);
      expect(result.recommended_sessions[0].recommendation_id).not.toBe(
        result.recommended_sessions[1].recommendation_id
      );
    }
  });

  it('should preserve extra fields in sessions', () => {
    const response: AIResponse = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          target_pace_min_km: '5:30',
          duration_min: 60,
          estimated_distance_km: 10.9,
          session_type: 'Footing',
          target_hr_zone: 'Z2',
        },
      ],
    };

    const result = validateAndFixRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0]).toMatchObject({
        session_type: 'Footing',
        target_hr_zone: 'Z2',
      });
    }
  });
});
