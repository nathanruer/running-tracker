import { NextRequest, NextResponse } from 'next/server';

import { HTTP_STATUS } from '@/lib/constants';
import { updateProfileSchema } from '@/lib/validation';
import { prisma } from '@/server/database';
import { handleGetRequest, handleApiRequest } from '@/server/services/api-handlers';

export const runtime = 'nodejs';

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

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: USER_WITH_PROFILE_SELECT,
      });

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: HTTP_STATUS.NOT_FOUND });
      }

      const stravaAccount = user.externalAccounts.find((a) => a.provider === 'strava') ?? null;
      const intervalsAccount = user.externalAccounts.find((a) => a.provider === 'intervals_icu') ?? null;
      const profile = user.profile ?? null;

      return NextResponse.json({
        user: {
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
        },
      });
    },
    { logContext: 'get-user-profile' }
  );
}

export async function PUT(request: NextRequest) {
  return handleApiRequest(
    request,
    updateProfileSchema,
    async (updateData, userId) => {
      await prisma.user_profiles.upsert({
        where: { userId },
        create: { userId, ...updateData },
        update: updateData,
      });

      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: USER_WITH_PROFILE_SELECT,
      });

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: HTTP_STATUS.NOT_FOUND });
      }

      const stravaAccount = user.externalAccounts.find((a) => a.provider === 'strava') ?? null;
      const intervalsAccount = user.externalAccounts.find((a) => a.provider === 'intervals_icu') ?? null;
      const profile = user.profile ?? null;

      return NextResponse.json({
        user: {
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
        },
      });
    },
    { logContext: 'update-user-profile' }
  );
}
