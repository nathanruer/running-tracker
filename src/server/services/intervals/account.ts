import 'server-only';
import { prisma } from '@/server/database';
import { INTERVALS_SOURCE } from './mapper';

export async function getIntervalsApiKey(userId: string): Promise<string | null> {
  const account = await prisma.connected_accounts.findUnique({
    where: { userId_provider: { userId, provider: INTERVALS_SOURCE } },
    select: { accessToken: true },
  });
  return account?.accessToken ?? null;
}
