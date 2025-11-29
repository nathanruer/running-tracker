import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { prisma } from '@/lib/database';
import { registerSchema } from '@/lib/validation';
import { createSessionToken, persistSessionCookie } from '@/lib/auth';
import { logger } from '@/lib/infrastructure/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = registerSchema.parse(body);

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
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Payload invalide' },
        { status: 400 },
      );
    }
    logger.error({ error }, 'User registration failed');
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 },
    );
  }
}

