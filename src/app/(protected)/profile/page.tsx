import ProfilePageClient from './profile-page-client';
import {
  DEFAULT_DATE_RANGE,
  DEFAULT_GRANULARITY,
  DEFAULT_PROFILE_TAB,
  VALID_DATE_RANGES,
  VALID_GRANULARITIES,
  VALID_PROFILE_TABS,
  type ProfileTab,
  type ProfileUrlParams,
} from '@/features/profile/constants/profile-url-params';

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | undefined;

type ProfilePageProps = {
  searchParams?: SearchParamsInput | Promise<SearchParamsInput>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  let params = new URLSearchParams();

  if (resolvedSearchParams instanceof URLSearchParams) {
    params = resolvedSearchParams;
  } else if (resolvedSearchParams) {
    const entries: Array<[string, string]> = [];
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) entries.push([key, item]);
      } else {
        entries.push([key, value]);
      }
    }
    params = new URLSearchParams(entries);
  }

  const rawTab = params.get('tab');
  const tab =
    rawTab && VALID_PROFILE_TABS.has(rawTab)
      ? (rawTab as ProfileTab)
      : DEFAULT_PROFILE_TAB;

  const rawRange = params.get('range');
  const range =
    rawRange && VALID_DATE_RANGES.has(rawRange)
      ? (rawRange as ProfileUrlParams['range'])
      : DEFAULT_DATE_RANGE;

  const rawGranularity = params.get('granularity');
  const granularity =
    rawGranularity && VALID_GRANULARITIES.has(rawGranularity)
      ? (rawGranularity as ProfileUrlParams['granularity'])
      : DEFAULT_GRANULARITY;
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const initialParams: ProfileUrlParams = { tab, range, granularity, from, to };

  return <ProfilePageClient initialParams={initialParams} />;
}
