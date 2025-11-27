import { prisma } from './prisma';

function getCalendarWeek(date: Date): { year: number; week: number } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const yearStart = new Date(monday.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((monday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return { year: monday.getFullYear(), week: weekNumber };
}

export async function recalculateSessionNumbers(userId: string): Promise<void> {
  const sessions = await prisma.trainingSession.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  if (sessions.length === 0) {
    return;
  }

  const sessionsWithWeek = sessions.map(session => ({
    ...session,
    calendarWeek: getCalendarWeek(session.date),
  }));

  const weekMap = new Map<string, typeof sessionsWithWeek>();
  
  for (const session of sessionsWithWeek) {
    const weekKey = `${session.calendarWeek.year}-W${session.calendarWeek.week}`;
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(session);
  }

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => {
    const [yearA, weekA] = a[0].split('-W').map(Number);
    const [yearB, weekB] = b[0].split('-W').map(Number);
    return yearA !== yearB ? yearA - yearB : weekA - weekB;
  });

  const updates: any[] = [];
  let globalSessionNumber = 1;

  for (let weekIndex = 0; weekIndex < sortedWeeks.length; weekIndex++) {
    const [, weekSessions] = sortedWeeks[weekIndex];
    weekSessions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (let sessionIndex = 0; sessionIndex < weekSessions.length; sessionIndex++) {
      const session = weekSessions[sessionIndex];
      updates.push(
        prisma.trainingSession.update({
          where: { id: session.id },
          data: {
            sessionNumber: globalSessionNumber,
            week: weekIndex + 1,
          },
        })
      );
      globalSessionNumber++;
    }
  }

  await prisma.$transaction(updates);
}