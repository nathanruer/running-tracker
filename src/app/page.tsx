import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import LoginCard from '@/features/auth/components/login-card';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/server/auth';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token && verifySessionToken(token)) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <LoginCard />
        </div>
      </div>
    </main>
  );
}
