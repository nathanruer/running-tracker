import 'server-only';
import { prisma } from '@/server/database';
import { toProvider } from './workout-v3';

/** Provider activities the athlete told us to leave out of the import list. */
export async function getDismissedExternalIds(userId: string, source: string): Promise<Set<string>> {
  const provider = toProvider(source);
  if (!provider) return new Set();

  const rows = await prisma.dismissed_source_activities.findMany({
    where: { userId, provider },
    select: { externalId: true },
  });
  return new Set(rows.map((row) => row.externalId));
}

export async function dismissSourceActivity(
  userId: string,
  source: string,
  externalId: string,
  reason?: string | null
): Promise<boolean> {
  const provider = toProvider(source);
  if (!provider) return false;

  await prisma.dismissed_source_activities.upsert({
    where: { userId_provider_externalId: { userId, provider, externalId } },
    create: { userId, provider, externalId, reason: reason ?? null },
    update: { reason: reason ?? null },
  });
  return true;
}

export async function restoreSourceActivity(
  userId: string,
  source: string,
  externalId: string
): Promise<boolean> {
  const provider = toProvider(source);
  if (!provider) return false;

  await prisma.dismissed_source_activities.deleteMany({ where: { userId, provider, externalId } });
  return true;
}
