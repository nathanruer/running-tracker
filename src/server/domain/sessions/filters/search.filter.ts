import 'server-only';
import { Prisma } from '@prisma/client';

/**
 * Generic search filter for both workouts and plan_sessions.
 * Searches in comments and sessionType fields.
 */
export interface SearchFilterResult {
  OR: Array<{
    comments?: { contains: string; mode: 'insensitive' };
    sessionType?: { contains: string; mode: 'insensitive' };
  }>;
}

/**
 * Builds a search filter for Prisma queries.
 * Works with both workouts and plan_sessions tables.
 * 
 * @param search - Search term to filter by
 * @returns Search filter object or null if search is empty
 * 
 * @example
 * const filter = buildSearchFilter('marathon');
 * // Returns: { OR: [{ comments: { contains: 'marathon', mode: 'insensitive' } }, ...] }
 */
export function buildSearchFilter(search?: string | null): SearchFilterResult | null {
  if (!search?.trim()) return null;
  
  const searchTerm = search.trim();
  
  return {
    OR: [
      { comments: { contains: searchTerm, mode: 'insensitive' as const } },
      { sessionType: { contains: searchTerm, mode: 'insensitive' as const } },
    ],
  };
}

/**
 * Type alias for Prisma workouts where input
 */
export type WorkoutsSearchFilter = Prisma.workoutsWhereInput;

/**
 * Type alias for Prisma plan_sessions where input
 */
export type PlanSessionsSearchFilter = Prisma.plan_sessionsWhereInput;

/**
 * Casts the generic search filter to workouts where input.
 * Use this when building Prisma queries for workouts.
 */
export function buildWorkoutsSearchFilter(search?: string | null): WorkoutsSearchFilter | null {
  const filter = buildSearchFilter(search);
  return filter as WorkoutsSearchFilter | null;
}

/**
 * Casts the generic search filter to plan_sessions where input.
 * Use this when building Prisma queries for plan_sessions.
 */
export function buildPlanSessionsSearchFilter(search?: string | null): PlanSessionsSearchFilter | null {
  const filter = buildSearchFilter(search);
  return filter as PlanSessionsSearchFilter | null;
}

/**
 * Builds a date filter for queries.
 * @param dateFrom - ISO date string for minimum date
 * @returns Date filter object or empty object
 */
export function buildDateFilter(dateFrom?: string | null): { date?: { gte: Date } } {
  if (!dateFrom) return {};
  return { date: { gte: new Date(dateFrom) } };
}

/**
 * Builds a session type filter.
 * @param sessionType - Type to filter by, 'all' means no filter
 * @returns Session type filter or empty object
 */
export function buildSessionTypeFilter(sessionType?: string | null): { sessionType?: string } {
  if (!sessionType || sessionType === 'all') return {};
  return { sessionType };
}

/**
 * Combines multiple filter objects into a single where clause.
 * Spreads all provided filters and removes null/undefined values.
 */
export function combineFilters<T extends Record<string, unknown>>(
  ...filters: Array<Partial<T> | null | undefined>
): Partial<T> {
  return filters.reduce<Partial<T>>((acc, filter) => {
    if (filter) {
      return { ...acc, ...filter };
    }
    return acc;
  }, {});
}
