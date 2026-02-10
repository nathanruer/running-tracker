import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/server/database';
import { registerSchema } from '@/lib/validation';
import { createSessionToken, persistSessionCookie } from '@/server/auth';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { logger } from '@/server/infrastructure/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest<{ email: string; password: string }>(
    request,
    registerSchema,
    async ({ email, password }) => {
      const existingUser = await prisma.users.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé.' },
          { status: HTTP_STATUS.BAD_REQUEST },
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.users.create({
        data: {
          email,
          password: hashedPassword,
        },
      });

      try {
        await prisma.user_profiles.create({
          data: { userId: user.id },
        });
        await prisma.user_preferences.create({
          data: { userId: user.id },
        });
      } catch (error) {
        logger.warn({ error, userId: user.id }, 'Failed to create shadow user records');
      }

      const token = createSessionToken(user.id);
      await persistSessionCookie(token);

      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
          },
        },
        { status: HTTP_STATUS.CREATED },
      );
    },
    { requireAuth: false, logContext: 'register' }
  );
}
