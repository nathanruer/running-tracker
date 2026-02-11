import type { DateRangeType, ChartGranularity } from '@/lib/domain/analytics/date-range';

export type ProfileTab = 'profile' | 'analytics' | 'history';

export type ProfileUrlParams = {
  tab: ProfileTab;
  range: DateRangeType;
  granularity: ChartGranularity;
  from: string;
  to: string;
};

export const PROFILE_TAB_VALUES = ['profile', 'analytics', 'history'] as const;
export const DATE_RANGE_VALUES = ['4weeks', '8weeks', '12weeks', 'all', 'custom'] as const satisfies ReadonlyArray<DateRangeType>;
export const GRANULARITY_VALUES = ['day', 'week', 'month'] as const;

export const DEFAULT_PROFILE_TAB: ProfileTab = 'profile';
export const DEFAULT_DATE_RANGE: DateRangeType = 'all';
export const DEFAULT_GRANULARITY: ChartGranularity = 'week';

export const VALID_PROFILE_TABS = new Set<string>(PROFILE_TAB_VALUES);
export const VALID_DATE_RANGES = new Set<string>(DATE_RANGE_VALUES);
export const VALID_GRANULARITIES = new Set<string>(GRANULARITY_VALUES);
