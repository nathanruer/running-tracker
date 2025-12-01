import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';
import { logger } from '@/lib/infrastructure/logger';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    await recalculateSessionNumbers(userId);

    logger.info({ userId }, 'Sessions recalculated successfully');

    return NextResponse.json({
      message: 'Les semaines ont été recalculées avec succès pour toutes vos séances',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to recalculate sessions');
    return NextResponse.json(
      { error: 'Erreur lors du recalcul des semaines' },
      { status: 500 }
    );
  }
}
