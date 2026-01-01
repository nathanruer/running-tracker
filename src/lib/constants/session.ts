// ============================================================================
// SESSION STATUS
// ============================================================================

export const SESSION_STATUS = {
  COMPLETED: 'completed',
  PLANNED: 'planned',
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// ============================================================================
// INTERVAL STEP TYPES
// ============================================================================

export const STEP_TYPES = {
  WARMUP: 'warmup',
  EFFORT: 'effort',
  RECOVERY: 'recovery',
  COOLDOWN: 'cooldown',
} as const;

export type StepType = (typeof STEP_TYPES)[keyof typeof STEP_TYPES];

// ============================================================================
// AI CONTEXT CONFIGURATION
// ============================================================================

export const AI_CONTEXT = {
  MAX_DETAILED_SESSIONS: 20,
  RECENT_MESSAGES_COUNT: 5,
  CHARS_PER_TOKEN: 4,
  SUMMARY_TRUNCATE_LENGTH: 100,
} as const;
