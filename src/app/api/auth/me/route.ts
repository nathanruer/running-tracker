import { NextRequest, NextResponse } from 'next/server';

import { HTTP_STATUS } from '@/lib/constants';
import { prisma } from '@/server/database';
import { handleGetRequest, handleApiRequest } from '@/server/services/api-handlers';

export const runtime = 'nodejs';

const USER_WITH_PROFILE_SELECT = {
  id: true,
  email: true,
  createdAt: true,
  externalAccounts: {
    where: { provider: 'strava' },
    select: { externalId: true, tokenExpiresAt: true },
    take: 1,
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

      const stravaAccount = user.externalAccounts[0] ?? null;
      const profile = user.profile ?? null;

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          stravaId: stravaAccount?.externalId ?? null,
          stravaTokenExpiresAt: stravaAccount?.tokenExpiresAt ?? null,
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
    null,
    async (_data, userId) => {
      const body = await request.json();
      const { weight, age, maxHeartRate, vma, goal } = body;

      const updateData: {
        weight?: number;
        age?: number;
        maxHeartRate?: number;
        vma?: number;
        goal?: string;
      } = {
        weight: weight !== undefined && weight !== '' ? parseFloat(weight) : undefined,
        age: age !== undefined && age !== '' ? parseInt(age) : undefined,
        maxHeartRate: maxHeartRate !== undefined && maxHeartRate !== '' ? parseInt(maxHeartRate) : undefined,
        vma: vma !== undefined && vma !== '' ? parseFloat(vma) : undefined,
        goal: goal !== undefined ? goal : undefined,
      };

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

      const stravaAccount = user.externalAccounts[0] ?? null;
      const profile = user.profile ?? null;

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          stravaId: stravaAccount?.externalId ?? null,
          stravaTokenExpiresAt: stravaAccount?.tokenExpiresAt ?? null,
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
