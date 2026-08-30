import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { queryKeys } from '@/lib/constants/query-keys';
import { verifySessionToken } from '@/server/auth';
import { runAsUser } from '@/server/database/tenant';
import { getUserProfilePayload } from '@/server/domain/users/user-profile';
import { fetchSessions } from '@/server/domain/sessions/sessions-read';
import ProfilePageClient from './profile-page-client';

export default async function ProfilePage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) {
    redirect('/');
  }
  const userId = payload.userId;

  const [user, allSessions] = await runAsUser(userId, () => Promise.all([
    getUserProfilePayload(userId),
    fetchSessions({
      userId,
      includePlannedDateAsDate: true,
      view: 'table',
    }),
  ]));

  if (!user) {
    redirect('/');
  }

  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.user(), user);
  queryClient.setQueryData(queryKeys.sessionsAll(userId), allSessions);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <ProfilePageClient />
      </Suspense>
    </HydrationBoundary>
  );
}
