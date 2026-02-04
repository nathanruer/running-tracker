import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAndFixRecommendations,
  validateAIResponse,
  enrichRecommendations,
} from '../validator';

vi.mock('@/server/infrastructure/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe('validateAIResponse', () => {
  it('should return success for valid conversation response', () => {
    const response = {
      responseType: 'conversation',
      message: 'Hello',
    };

    const result = validateAIResponse(response);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseType).toBe('conversation');
    }
  });

  it('should return success for valid recommendations response', () => {
    const response = {
      responseType: 'recommendations',
      recommended_sessions: [
        { duration_min: 60, estimated_distance_km: 10 },
      ],
    };

    const result = validateAIResponse(response);

    expect(result.success).toBe(true);
  });

  it('should return fallback for invalid response', () => {
    const response = {
      responseType: 'unknown',
      data: 'invalid',
    };

    const result = validateAIResponse(response);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fallback.responseType).toBe('conversation');
      if (result.fallback.responseType === 'conversation') {
        expect(result.fallback.message).toBe('Erreur de format de réponse.');
      }
    }
  });

  it('should return fallback for missing required fields', () => {
    const response = {
      responseType: 'recommendations',
    };

    const result = validateAIResponse(response);

    expect(result.success).toBe(false);
  });
});

describe('enrichRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return conversation responses unchanged', () => {
    const response = {
      responseType: 'conversation' as const,
      message: 'Hello',
    };

    const result = enrichRecommendations(response);

    expect(result).toEqual(response);
  });

  it('should add recommendation_id to sessions', () => {
    const response = {
      responseType: 'recommendations' as const,
      recommended_sessions: [
        { duration_min: 60, estimated_distance_km: 10 },
      ],
    };

    const result = enrichRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0].recommendation_id).toBeDefined();
    }
  });

  it('should not mutate the original response', () => {
    const response = {
      responseType: 'recommendations' as const,
      recommended_sessions: [
        { duration_min: 60, estimated_distance_km: 10 },
      ],
    };
    const originalSessions = [...response.recommended_sessions];

    enrichRecommendations(response);

    expect(response.recommended_sessions).toEqual(originalSessions);
  });
});

describe('validateAndFixRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return conversation responses unchanged', () => {
    const response = {
      responseType: 'conversation',
      message: 'Hello',
    };

    const result = validateAndFixRecommendations(response);

    expect(result.responseType).toBe('conversation');
    if (result.responseType === 'conversation') {
      expect(result.message).toBe('Hello');
    }
  });

  it('should add recommendation_id to each session', () => {
    const response = {
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
    const response = {
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
    const response = {
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
    const response = {
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

  it('should return fallback for completely invalid input', () => {
    const response = {
      invalid: 'data',
    };

    const result = validateAndFixRecommendations(response);

    expect(result.responseType).toBe('conversation');
    if (result.responseType === 'conversation') {
      expect(result.message).toBe('Erreur de format de réponse.');
    }
  });

  it('should handle invalid pace format', () => {
    const response = {
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
    const response = {
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
    const response = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          target_pace_min_km: '5:30',
          duration_min: 60,
          estimated_distance_km: 10.9,
          session_type: 'Footing',
        },
      ],
    };

    const result = validateAndFixRecommendations(response);

    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions[0]).toMatchObject({
        session_type: 'Footing',
      });
    }
  });
});
