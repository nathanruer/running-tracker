import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { queryKeys } from '@/lib/constants/query-keys';
import { computeDateFrom, VALID_PERIODS, type Period } from '@/lib/domain/sessions/period';
import { verifySessionToken } from '@/server/auth';
import { getUserProfilePayload } from '@/server/domain/users/user-profile';
import {
  fetchSessions,
  fetchSessionCount,
  fetchSessionTypes,
} from '@/server/domain/sessions/sessions-read';
import DashboardClient from './dashboard-client';

const PAGE_SIZE = 10;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) {
    redirect('/');
  }
  const userId = payload.userId;

  const params = await searchParams;
  const selectedType = firstValue(params.type) || 'all';
  const search = firstValue(params.search).trim();
  const rawPeriod = firstValue(params.period);
  const period: Period = VALID_PERIODS.has(rawPeriod) ? (rawPeriod as Period) : 'all';
  const sortParam = firstValue(params.sort) || undefined;
  const dateFrom = computeDateFrom(period);

  const sessionTypeFilter = selectedType !== 'all' ? selectedType : undefined;

  const [user, types, count, firstPage, plannedSessions] = await Promise.all([
    getUserProfilePayload(userId),
    fetchSessionTypes(userId),
    fetchSessionCount({ userId, sessionType: sessionTypeFilter, search, dateFrom }),
    fetchSessions({
      userId,
      limit: PAGE_SIZE,
      offset: 0,
      sessionType: sessionTypeFilter,
      sort: sortParam,
      search,
      dateFrom,
      view: 'table',
    }),
    fetchSessions({
      userId,
      limit: 20,
      offset: 0,
      status: 'planned',
      view: 'table',
    }),
  ]);

  if (!user) {
    redirect('/');
  }

  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.user(), user);
  queryClient.setQueryData(queryKeys.plannedUpcoming(userId), plannedSessions);
  queryClient.setQueryData(queryKeys.sessionTypes(userId), [...types].sort());
  queryClient.setQueryData(
    queryKeys.sessionsCount({ selectedType, search, dateFrom, userId }),
    count
  );
  queryClient.setQueryData(
    queryKeys.sessionsPaginated({
      selectedType,
      sortKey: sortParam || 'default',
      search,
      dateFrom,
      userId,
    }),
    { pages: [firstPage], pageParams: [0] }
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <DashboardClient />
      </Suspense>
    </HydrationBoundary>
  );
}
