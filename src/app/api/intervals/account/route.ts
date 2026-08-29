import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/database';
import { handleApiRequest, handleDeleteRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { logger } from '@/server/infrastructure/logger';
import { getIntervalsAthlete } from '@/server/services/intervals/client';
import { INTERVALS_SOURCE } from '@/server/services/intervals/mapper';

export const runtime = 'nodejs';

const connectSchema = z.object({
  apiKey: z.string().min(10, { message: 'Clé API invalide' }).max(200),
});

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    connectSchema,
    async (data, userId) => {
      let athleteId: string;
      try {
        const athlete = await getIntervalsAthlete(data.apiKey.trim());
        athleteId = athlete.id;
      } catch (error) {
        logger.warn({ error, userId }, 'intervals-key-validation-failed');
        return NextResponse.json(
          { error: 'Clé API refusée par intervals.icu. Vérifie ta clé dans Settings → Developer.' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const existing = await prisma.external_accounts.findUnique({
        where: { provider_externalId: { provider: INTERVALS_SOURCE, externalId: athleteId } },
        select: { userId: true },
      });

      if (existing && existing.userId !== userId) {
        return NextResponse.json(
          { error: 'Ce compte intervals.icu est déjà lié à un autre utilisateur.' },
          { status: HTTP_STATUS.CONFLICT }
        );
      }

      await prisma.external_accounts.upsert({
        where: { userId_provider: { userId, provider: INTERVALS_SOURCE } },
        create: {
          userId,
          provider: INTERVALS_SOURCE,
          externalId: athleteId,
          accessToken: data.apiKey.trim(),
        },
        update: {
          externalId: athleteId,
          accessToken: data.apiKey.trim(),
        },
      });

      return NextResponse.json({ athleteId }, { status: HTTP_STATUS.CREATED });
    },
    { logContext: 'connect-intervals-account' }
  );
}

export async function DELETE(request: NextRequest) {
  return handleDeleteRequest(
    request,
    async (userId) => {
      await prisma.external_accounts.deleteMany({
        where: { userId, provider: INTERVALS_SOURCE },
      });
      return NextResponse.json({ success: true });
    },
    { logContext: 'disconnect-intervals-account' }
  );
}
