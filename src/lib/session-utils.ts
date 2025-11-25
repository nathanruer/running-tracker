import { prisma } from './prisma';

export async function recalculateSessionNumbers(userId: string): Promise<void> {
  const sessions = await prisma.trainingSession.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  if (sessions.length === 0) {
    return;
  }

  const firstSessionDate = sessions[0].date;

  const updates = sessions.map((session, index) => {
    const daysDiff = Math.floor(
      (session.date.getTime() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const week = Math.floor(daysDiff / 7) + 1;

    return prisma.trainingSession.update({
      where: { id: session.id },
      data: {
        sessionNumber: index + 1,
        week,
      },
    });
  });

  await prisma.$transaction(updates);
}
