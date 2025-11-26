import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      stravaId: true,
      stravaTokenExpiresAt: true,
      weight: true,
      age: true,
      maxHeartRate: true,
      vma: true,
    } as any,
  });

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, weight, age, maxHeartRate, vma } = body;

    const updateData: any = {
      email,
      weight: weight !== undefined && weight !== '' ? parseFloat(weight) : undefined,
      age: age !== undefined && age !== '' ? parseInt(age) : undefined,
      maxHeartRate: maxHeartRate !== undefined && maxHeartRate !== '' ? parseInt(maxHeartRate) : undefined,
      vma: vma !== undefined && vma !== '' ? parseFloat(vma) : undefined,
    };

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        createdAt: true,
        stravaId: true,
        stravaTokenExpiresAt: true,
        weight: true,
        age: true,
        maxHeartRate: true,
        vma: true,
      } as any,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}

