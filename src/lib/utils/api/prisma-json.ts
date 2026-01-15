import type { Prisma } from '@prisma/client';

export function toPrismaJson<T extends object>(data: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
}
