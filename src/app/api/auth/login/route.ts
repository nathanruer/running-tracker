import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database';
import { createSessionToken, persistSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { handleApiRequest } from '@/lib/services/api-handlers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest<{ email: string; password: string }>(
    request,
    loginSchema,
    async ({ email, password }) => {
      const user = await prisma.users.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json(
          { error: 'Identifiants invalides' },
          { status: 401 },
        );
      }

      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        return NextResponse.json(
          { error: 'Identifiants invalides' },
          { status: 401 },
        );
      }

      const token = createSessionToken(user.id);
      await persistSessionCookie(token);

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
        },
      });
    },
    { requireAuth: false, logContext: 'login' }
  );
}

