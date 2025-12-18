import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/infrastructure/logger';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      logger.warn('Unauthorized attempt to disconnect Strava');
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found when trying to disconnect Strava');
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    if (!user.stravaId) {
      logger.warn({ userId }, 'User tried to disconnect Strava but has no Strava account linked');
      return NextResponse.json(
        { error: 'Aucun compte Strava n\'est actuellement lié' },
        { status: 400 }
      );
    }

    await prisma.users.update({
      where: { id: userId },
      data: {
        stravaId: null,
        stravaAccessToken: null,
        stravaRefreshToken: null,
        stravaTokenExpiresAt: null,
      }
    });

    logger.info({ userId }, 'Successfully disconnected Strava account');

    return NextResponse.json({
      success: true,
      message: 'Compte Strava déconnecté avec succès'
    });

  } catch (error) {
    logger.error({ error }, 'Failed to disconnect Strava account');
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la déconnexion de Strava' },
      { status: 500 }
    );
  }
}