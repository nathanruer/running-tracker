import { describe, it, expect } from 'vitest';
import {
  aiRecommendedSessionSchema,
  aiRecommendationsResponseSchema,
  aiConversationResponseSchema,
  aiResponseSchema,
} from '../ai-response';

describe('aiRecommendedSessionSchema', () => {
  it('should validate a minimal valid session', () => {
    const session = {
      duration_min: 60,
      estimated_distance_km: 10,
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(true);
  });

  it('should coerce string numbers to numbers', () => {
    const session = {
      duration_min: '60',
      estimated_distance_km: '10.5',
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.duration_min).toBe(60);
      expect(result.data.estimated_distance_km).toBe(10.5);
    }
  });

  it('should validate a complete session', () => {
    const session = {
      recommendation_id: 'abc-123',
      session_type: 'Footing',
      duration_min: 60,
      estimated_distance_km: 10.5,
      target_pace_min_km: '5:30',
      target_hr_bpm: 145,
      description: 'Easy run',
      target_rpe: 6,
      interval_structure: null,
      interval_details: null,
      sessionNumber: 15,
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(true);
  });

  it('should reject duration_min less than 1', () => {
    const session = {
      duration_min: 0,
      estimated_distance_km: 10,
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  it('should reject negative estimated_distance_km', () => {
    const session = {
      duration_min: 60,
      estimated_distance_km: -5,
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  it('should reject invalid target_hr_bpm', () => {
    const session = {
      duration_min: 60,
      estimated_distance_km: 10,
      target_hr_bpm: 300,
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  it('should reject invalid target_rpe', () => {
    const session = {
      duration_min: 60,
      estimated_distance_km: 10,
      target_rpe: 15,
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(false);
  });

  it('should accept zero distance for rest days', () => {
    const session = {
      duration_min: 30,
      estimated_distance_km: 0,
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(true);
  });
});

describe('aiRecommendationsResponseSchema', () => {
  it('should validate a recommendations response', () => {
    const response = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          duration_min: 60,
          estimated_distance_km: 10,
          session_type: 'Footing',
        },
      ],
      week_summary: 'A balanced training week',
      rationale: 'Focus on base building',
    };

    const result = aiRecommendationsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate with empty sessions array', () => {
    const response = {
      responseType: 'recommendations',
      recommended_sessions: [],
    };

    const result = aiRecommendationsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should reject wrong responseType', () => {
    const response = {
      responseType: 'conversation',
      recommended_sessions: [],
    };

    const result = aiRecommendationsResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should reject missing recommended_sessions', () => {
    const response = {
      responseType: 'recommendations',
    };

    const result = aiRecommendationsResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

describe('aiConversationResponseSchema', () => {
  it('should validate a conversation response', () => {
    const response = {
      responseType: 'conversation',
      message: 'Hello, how can I help you?',
    };

    const result = aiConversationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should reject missing message', () => {
    const response = {
      responseType: 'conversation',
    };

    const result = aiConversationResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should reject wrong responseType', () => {
    const response = {
      responseType: 'recommendations',
      message: 'Hello',
    };

    const result = aiConversationResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should accept rationale and transform it to message', () => {
    const response = {
      responseType: 'conversation',
      rationale: 'Ta progression est tres encourageante.',
    };

    const result = aiConversationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('Ta progression est tres encourageante.');
    }
  });

  it('should prefer message over rationale when both present', () => {
    const response = {
      responseType: 'conversation',
      message: 'Primary message',
      rationale: 'Fallback rationale',
    };

    const result = aiConversationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('Primary message');
    }
  });
});

describe('aiRecommendedSessionSchema with interval_details', () => {
  it('should validate a session with interval_details from AI', () => {
    const session = {
      day: 'Mardi',
      sessionNumber: 54,
      session_type: 'Fractionné',
      duration_min: 66,
      estimated_distance_km: 11.1,
      target_pace_min_km: '05:00',
      target_hr_bpm: 170,
      target_rpe: 7,
      description: 'Échauffement 15\', puis 3 séries...',
      interval_structure: 'TEMPO: 3x12:00 R:01:30',
      interval_details: {
        workoutType: 'TEMPO',
        repetitionCount: 3,
        effortDuration: '12:00',
        recoveryDuration: '01:30',
        targetEffortPace: '05:00',
        targetRecoveryPace: '07:30',
        targetEffortHR: 170,
        steps: [
          { stepType: 'warmup', duration: '15:00', distance: 2, pace: '07:30', hr: 135 },
          { stepType: 'effort', duration: '12:00', distance: 2.4, pace: '05:00', hr: 170 },
          { stepType: 'recovery', duration: '01:30', distance: 0.2, pace: '07:30', hr: 145 },
          { stepType: 'effort', duration: '12:00', distance: 2.4, pace: '05:00', hr: 170 },
          { stepType: 'recovery', duration: '01:30', distance: 0.2, pace: '07:30', hr: 145 },
          { stepType: 'effort', duration: '12:00', distance: 2.4, pace: '05:00', hr: 170 },
          { stepType: 'cooldown', duration: '10:00', distance: 1.33, pace: '07:30', hr: 135 },
        ],
      },
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interval_details?.workoutType).toBe('TEMPO');
      expect(result.data.interval_details?.steps).toHaveLength(7);
    }
  });

  it('should accept interval_details without effortDistance and recoveryDistance', () => {
    const session = {
      duration_min: 60,
      estimated_distance_km: 10,
      interval_details: {
        workoutType: 'VMA',
        repetitionCount: 8,
        effortDuration: '01:00',
        recoveryDuration: '01:00',
        targetEffortPace: '04:00',
        targetEffortHR: 175,
        steps: [
          { stepType: 'warmup', duration: '10:00', distance: 1.5, pace: '07:00', hr: 130 },
          { stepType: 'effort', duration: '01:00', distance: 0.25, pace: '04:00', hr: 175 },
        ],
      },
    };

    const result = aiRecommendedSessionSchema.safeParse(session);
    expect(result.success).toBe(true);
  });
});

describe('aiResponseSchema discriminated union', () => {
  it('should correctly parse recommendations response', () => {
    const response = {
      responseType: 'recommendations',
      recommended_sessions: [
        { duration_min: 45, estimated_distance_km: 8 },
      ],
    };

    const result = aiResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseType).toBe('recommendations');
    }
  });

  it('should correctly parse conversation response', () => {
    const response = {
      responseType: 'conversation',
      message: 'Test message',
    };

    const result = aiResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseType).toBe('conversation');
    }
  });

  it('should reject unknown responseType', () => {
    const response = {
      responseType: 'unknown',
      data: {},
    };

    const result = aiResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should reject missing responseType', () => {
    const response = {
      message: 'Test',
    };

    const result = aiResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should validate multiple sessions with varied data', () => {
    const response = {
      responseType: 'recommendations',
      recommended_sessions: [
        {
          duration_min: 30,
          estimated_distance_km: 5,
          session_type: 'Échauffement',
          target_rpe: 3,
        },
        {
          duration_min: 45,
          estimated_distance_km: 8,
          session_type: 'Fractionné',
          target_pace_min_km: '4:30',
          interval_structure: '10x400m',
        },
        {
          duration_min: 90,
          estimated_distance_km: 15,
          session_type: 'Sortie longue',
          target_hr_bpm: 140,
        },
      ],
      week_summary: 'Progressive week',
    };

    const result = aiResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success && result.data.responseType === 'recommendations') {
      expect(result.data.recommended_sessions).toHaveLength(3);
    }
  });
});
