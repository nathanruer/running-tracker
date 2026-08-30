import 'server-only';
import { prisma } from '@/server/database';

const USER_WITH_PROFILE_SELECT = {
  id: true,
  email: true,
  createdAt: true,
  connectedAccounts: {
    select: { provider: true, externalId: true, tokenExpiresAt: true },
  },
  profile: {
    select: {
      weight: true,
      age: true,
      maxHeartRate: true,
      vma: true,
      goal: true,
    },
  },
} as const;

export async function getUserProfilePayload(userId: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: USER_WITH_PROFILE_SELECT,
  });

  if (!user) return null;

  const intervalsAccount = user.connectedAccounts.find((a) => a.provider === 'intervals_icu') ?? null;
  const profile = user.profile ?? null;

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    intervalsAthleteId: intervalsAccount?.externalId ?? null,
    weight: profile?.weight ?? null,
    age: profile?.age ?? null,
    maxHeartRate: profile?.maxHeartRate ?? null,
    vma: profile?.vma ?? null,
    goal: profile?.goal ?? null,
  };
}
