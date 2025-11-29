import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { prisma } from '@/lib/database';
import { createSessionToken, persistSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { logger } from '@/lib/infrastructure/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

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
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Payload invalide' },
        { status: 400 },
      );
    }
    logger.error({ error }, 'User login failed');
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    );
  }
}

