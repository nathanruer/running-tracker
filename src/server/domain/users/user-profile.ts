import 'server-only';
import { prisma } from '@/server/database';

const USER_WITH_PROFILE_SELECT = {
  id: true,
  email: true,
  createdAt: true,
  externalAccounts: {
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

  const stravaAccount = user.externalAccounts.find((a) => a.provider === 'strava') ?? null;
  const intervalsAccount = user.externalAccounts.find((a) => a.provider === 'intervals_icu') ?? null;
  const profile = user.profile ?? null;

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    stravaId: stravaAccount?.externalId ?? null,
    stravaTokenExpiresAt: stravaAccount?.tokenExpiresAt ?? null,
    intervalsAthleteId: intervalsAccount?.externalId ?? null,
    weight: profile?.weight ?? null,
    age: profile?.age ?? null,
    maxHeartRate: profile?.maxHeartRate ?? null,
    vma: profile?.vma ?? null,
    goal: profile?.goal ?? null,
  };
}
