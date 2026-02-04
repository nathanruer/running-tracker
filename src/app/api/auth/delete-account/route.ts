import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/database/prisma';
import { getUserIdFromRequest, clearSessionCookie } from '@/server/auth';
import { logger } from '@/server/infrastructure/logger';

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.users.delete({
      where: {
        id: userId,
      },
    });

    clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, userId: await getUserIdFromRequest(request) }, 'Failed to delete account');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
