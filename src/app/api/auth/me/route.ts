import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/database';
import { handleGetRequest, handleApiRequest } from '@/lib/services/api-handlers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleGetRequest(
    request,
    async (userId) => {
      const user = await prisma.users.findUnique({
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
          goal: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
      }

      return NextResponse.json({ user });
    },
    { logContext: 'get-user-profile' }
  );
}

export async function PUT(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async (_data, userId) => {
      const body = await request.json();
      const { weight, age, maxHeartRate, vma, goal } = body;

      const updateData: {
        weight?: number;
        age?: number;
        maxHeartRate?: number;
        vma?: number;
        goal?: string;
      } = {
        weight: weight !== undefined && weight !== '' ? parseFloat(weight) : undefined,
        age: age !== undefined && age !== '' ? parseInt(age) : undefined,
        maxHeartRate: maxHeartRate !== undefined && maxHeartRate !== '' ? parseInt(maxHeartRate) : undefined,
        vma: vma !== undefined && vma !== '' ? parseFloat(vma) : undefined,
        goal: goal !== undefined ? goal : undefined,
      };

      const user = await prisma.users.update({
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
          goal: true,
        },
      });

      return NextResponse.json({ user });
    },
    { logContext: 'update-user-profile' }
  );
}

