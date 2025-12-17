import { prisma } from '@/lib/database';
import { Prisma } from '@prisma/client';

export async function recalculateSessionNumbers(userId: string): Promise<void> {
  const sessions = await prisma.training_sessions.findMany({
    where: { userId },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, date: true, status: true, sessionNumber: true },
  });

  if (sessions.length === 0) return;

  const sessionsWithDates = sessions.filter(s => s.date !== null);
  const plannedWithoutDates = sessions.filter(s => s.status === 'planned' && s.date === null);

  const updates: { id: string; sessionNumber: number; week: number | null }[] = [];
  let globalSessionNumber = 1;

  const weekMap = new Map<string, typeof sessions>();
  
  for (const session of sessionsWithDates) {
    const weekKey = getWeekKey(session.date!);
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(session);
  }

  const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (let weekIndex = 0; weekIndex < sortedWeeks.length; weekIndex++) {
    const [, weekSessions] = sortedWeeks[weekIndex];
    const trainingWeek = weekIndex + 1;

    weekSessions.sort((a, b) => a.date!.getTime() - b.date!.getTime());

    for (const session of weekSessions) {
      updates.push({
        id: session.id,
        sessionNumber: globalSessionNumber,
        week: trainingWeek,
      });
      globalSessionNumber++;
    }
  }

  for (const session of plannedWithoutDates) {
    updates.push({
      id: session.id,
      sessionNumber: globalSessionNumber,
      week: null,
    });
    globalSessionNumber++;
  }

  if (updates.length === 0) return;

  const sessionNumberCases = updates
    .map(u => `WHEN id = '${u.id}' THEN ${u.sessionNumber}`)
    .join(' ');
  
  const weekCases = updates
    .map(u => `WHEN id = '${u.id}' THEN ${u.week === null ? 'NULL' : u.week}`)
    .join(' ');
  
  const ids = updates.map(u => `'${u.id}'`).join(',');

  await prisma.$executeRaw`
    UPDATE training_sessions 
    SET 
      "sessionNumber" = CASE ${Prisma.raw(sessionNumberCases)} END,
      week = CASE ${Prisma.raw(weekCases)} END
    WHERE id IN (${Prisma.raw(ids)})
  `;
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const yearStart = new Date(monday.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((monday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return `${monday.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}