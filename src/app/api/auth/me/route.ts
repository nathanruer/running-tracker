import { NextRequest, NextResponse } from 'next/server';

import { HTTP_STATUS } from '@/lib/constants';
import { updateProfileSchema } from '@/lib/validation';
import { prisma } from '@/server/database';
import { getUserProfilePayload } from '@/server/domain/users/user-profile';
import { handleGetRequest, handleApiRequest } from '@/server/services/api-handlers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const user = await getUserProfilePayload(userId);

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: HTTP_STATUS.NOT_FOUND });
      }

      return NextResponse.json({ user });
    },
    { logContext: 'get-user-profile' }
  );
}

export async function PUT(request: NextRequest) {
  return handleApiRequest(
    request,
    updateProfileSchema,
    async (updateData, userId) => {
      await prisma.athlete_profiles.upsert({
        where: { userId },
        create: { userId, ...updateData },
        update: updateData,
      });

      const user = await getUserProfilePayload(userId);

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: HTTP_STATUS.NOT_FOUND });
      }

      return NextResponse.json({ user });
    },
    { logContext: 'update-user-profile' }
  );
}
