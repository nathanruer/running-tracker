import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database';
import { registerSchema } from '@/lib/validation';
import { createSessionToken, persistSessionCookie } from '@/lib/auth';
import { handleApiRequest } from '@/lib/services/api-handlers';

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
          { status: 400 },
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.users.create({
        data: {
          email,
          password: hashedPassword,
        },
      });

      const token = createSessionToken(user.id);
      await persistSessionCookie(token);

      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
          },
        },
        { status: 201 },
      );
    },
    { requireAuth: false, logContext: 'register' }
  );
}

