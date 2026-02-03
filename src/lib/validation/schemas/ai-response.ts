import { z } from 'zod';
import { stepTypeEnum } from './entities';

const aiIntervalStepSchema = z.object({
  stepNumber: z.coerce.number().min(1).optional(),
  stepType: stepTypeEnum,
  duration: z.string().nullable().optional(),
  distance: z.coerce.number().nullable().optional(),
  pace: z.string().nullable().optional(),
  hr: z.coerce.number().nullable().optional(),
  hrRange: z.string().nullable().optional(),
});

const aiIntervalDetailsSchema = z.object({
  workoutType: z.string().nullable().optional(),
  repetitionCount: z.coerce.number().min(1).nullable().optional(),
  effortDuration: z.string().nullable().optional(),
  recoveryDuration: z.string().nullable().optional(),
  effortDistance: z.coerce.number().nullable().optional(),
  recoveryDistance: z.coerce.number().nullable().optional(),
  targetEffortPace: z.string().nullable().optional(),
  targetEffortHR: z.coerce.number().nullable().optional(),
  targetRecoveryPace: z.string().nullable().optional(),
  steps: z.array(aiIntervalStepSchema).optional(),
});

export const aiRecommendedSessionSchema = z.object({
  recommendation_id: z.string().optional(),
  session_type: z.string().optional(),
  duration_min: z.coerce.number().min(1),
  estimated_distance_km: z.coerce.number().min(0),
  target_pace_min_km: z.string().optional(),
  target_hr_bpm: z.coerce.number().min(30).max(250).optional(),
  description: z.string().optional(),
  target_rpe: z.coerce.number().min(1).max(10).optional(),
  interval_structure: z.string().nullable().optional(),
  interval_details: aiIntervalDetailsSchema.nullable().optional(),
  sessionNumber: z.coerce.number().min(1).optional(),
});

export const aiRecommendationsResponseSchema = z.object({
  responseType: z.literal('recommendations'),
  recommended_sessions: z.array(aiRecommendedSessionSchema),
  week_summary: z.string().optional(),
  rationale: z.string().optional(),
});

export const aiConversationResponseSchema = z.object({
  responseType: z.literal('conversation'),
  message: z.string().optional(),
  rationale: z.string().optional(),
}).refine(
  (data) => data.message !== undefined || data.rationale !== undefined,
  { message: 'Either message or rationale is required' }
).transform((data) => ({
  ...data,
  message: data.message ?? data.rationale ?? '',
}));

export const aiResponseSchema = z.discriminatedUnion('responseType', [
  aiRecommendationsResponseSchema,
  aiConversationResponseSchema,
]);

export type AIRecommendedSessionValidated = z.infer<typeof aiRecommendedSessionSchema>;
export type AIRecommendationsResponseValidated = z.infer<typeof aiRecommendationsResponseSchema>;
export type AIConversationResponseValidated = z.infer<typeof aiConversationResponseSchema>;
export type AIResponseValidated = z.infer<typeof aiResponseSchema>;
