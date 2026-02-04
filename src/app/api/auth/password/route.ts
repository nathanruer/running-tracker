import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/server/database';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    passwordSchema,
    async (data, userId) => {
      const { currentPassword, newPassword } = data;

      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Utilisateur introuvable' },
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }

      const passwordMatches = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatches) {
        return NextResponse.json(
          { error: 'Mot de passe actuel incorrect' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.users.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({ success: true, message: 'Mot de passe mis à jour avec succès' });
    },
    { logContext: 'update-password' }
  );
}
