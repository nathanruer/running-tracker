/**
 * Checks if a session type is a "Fractionné" type
 * Handles both with and without accent, case insensitive
 */
export function isFractionneType(sessionType: string | null | undefined): boolean {
  if (!sessionType) return false;
  const normalized = sessionType.toLowerCase().trim();
  return normalized === 'fractionné' || normalized === 'fractionne';
}

/**
 * Checks if a session type is a quality session (interval-based)
 * Includes Fractionné, VMA, Seuil, Tempo, Spécifique
 */
export function isQualitySessionType(sessionType: string | null | undefined): boolean {
  if (!sessionType) return false;
  const normalized = sessionType.toLowerCase().trim();
  return (
    isFractionneType(sessionType) ||
    normalized === 'vma' ||
    normalized === 'seuil' ||
    normalized === 'tempo' ||
    normalized === 'spécifique' ||
    normalized === 'specifique'
  );
}

/**
 * Known workout types for quality sessions.
 */
export const WORKOUT_TYPES = ['VMA', 'TEMPO', 'SEUIL', 'SPÉCIFIQUE'] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

/**
 * Normalizes a workoutType string to a known WorkoutType.
 * Returns null if not recognized.
 */
export function normalizeWorkoutType(workoutType: string | null | undefined): WorkoutType | null {
  if (!workoutType) return null;
  const normalized = workoutType.toUpperCase().trim();
  if (normalized === 'SPECIFIQUE') return 'SPÉCIFIQUE';
  if (WORKOUT_TYPES.includes(normalized as WorkoutType)) {
    return normalized as WorkoutType;
  }
  return null;
}
