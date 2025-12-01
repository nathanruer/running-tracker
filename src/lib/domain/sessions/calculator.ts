import { prisma } from '@/lib/database';

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
  const sessions = await prisma.training_sessions.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  const completedSessions = sessions.filter(s => s.date !== null && s.status === 'completed');
  const plannedSessions = sessions.filter(s => s.status === 'planned');

  if (completedSessions.length === 0 && plannedSessions.length === 0) {
    return;
  }

  const updates: any[] = [];
  let globalSessionNumber = 1;

  type SessionWithDate = typeof sessions[0];
  const weekMap = new Map<string, SessionWithDate[]>();

  if (completedSessions.length > 0) {
    const sessionsWithWeek = completedSessions.map(session => ({
      ...session,
      calendarWeek: getCalendarWeek(session.date!),
    }));

    for (const session of sessionsWithWeek) {
      const weekKey = `${session.calendarWeek.year}-W${session.calendarWeek.week}`;
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(session);
    }
  }

  const plannedSessionsWithDates = plannedSessions.filter(s => s.date !== null);
  if (plannedSessionsWithDates.length > 0) {
    for (const session of plannedSessionsWithDates) {
      const calendarWeek = getCalendarWeek(session.date!);
      const weekKey = `${calendarWeek.year}-W${calendarWeek.week}`;
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(session);
    }
  }

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => {
    const [yearA, weekA] = a[0].split('-W').map(Number);
    const [yearB, weekB] = b[0].split('-W').map(Number);
    return yearA !== yearB ? yearA - yearB : weekA - weekB;
  });

  const weekKeyToTrainingWeek = new Map<string, number>();
  sortedWeeks.forEach(([weekKey], index) => {
    weekKeyToTrainingWeek.set(weekKey, index + 1);
  });

  for (let weekIndex = 0; weekIndex < sortedWeeks.length; weekIndex++) {
    const [weekKey, weekSessions] = sortedWeeks[weekIndex];
    const trainingWeek = weekIndex + 1;

    weekSessions.sort((a, b) => a.date!.getTime() - b.date!.getTime());

    for (const session of weekSessions) {
      updates.push(
        prisma.training_sessions.update({
          where: { id: session.id },
          data: {
            sessionNumber: globalSessionNumber,
            week: trainingWeek,
          },
        })
      );
      globalSessionNumber++;
    }
  }

  const plannedSessionsWithoutDates = plannedSessions.filter(s => s.date === null);
  if (plannedSessionsWithoutDates.length > 0) {
    const sortedPlannedSessions = plannedSessionsWithoutDates.sort((a, b) => a.sessionNumber - b.sessionNumber);

    for (const session of sortedPlannedSessions) {
      updates.push(
        prisma.training_sessions.update({
          where: { id: session.id },
          data: {
            sessionNumber: globalSessionNumber,
            week: null, // Reset week to null for sessions without dates
          },
        })
      );
      globalSessionNumber++;
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}