import 'server-only';
import { Prisma, PrismaClient } from '@prisma/client';
import { tenantStorage } from './tenant';

const TENANT_SETTING = 'app.user_id';
const LOG_LEVELS: Prisma.LogLevel[] =
  process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'error', 'warn'] : ['error', 'warn'];

export function createBaseClient(datasourceUrl?: string) {
  return new PrismaClient({ log: LOG_LEVELS, ...(datasourceUrl ? { datasourceUrl } : {}) });
}

/**
 * Every operation runs in a transaction that first sets `app.user_id` to the current tenant
 * (see `runAsUser`), which the row level security policies read. Without a tenant nothing is
 * visible; inside `tenantTransaction` the setting is already in place.
 */
export function withTenantIsolation(client: PrismaClient) {
  const scoped = <Args, Result>({ args, query }: { args: Args; query: (args: Args) => Promise<Result> }): Promise<Result> => {
    const tenant = tenantStorage.getStore();
    if (!tenant || tenant.inTransaction) return query(args);
    return client
      .$transaction([
        client.$executeRaw`SELECT set_config(${TENANT_SETTING}, ${tenant.userId}, true)`,
        query(args) as unknown as Prisma.PrismaPromise<Result>,
      ])
      .then(([, result]) => result);
  };

  return client.$extends({
    name: 'tenant-isolation',
    query: {
      $allModels: { $allOperations: scoped },
      $queryRaw: scoped,
      $queryRawUnsafe: scoped,
      $executeRaw: scoped,
      $executeRawUnsafe: scoped,
    },
  });
}

export function createTenantTransaction(client: PrismaClient) {
  return function tenantTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number }
  ): Promise<T> {
    const tenant = tenantStorage.getStore();
    if (!tenant) throw new Error('tenantTransaction() appelé hors de runAsUser()');
    return client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config(${TENANT_SETTING}, ${tenant.userId}, true)`;
      return tenantStorage.run({ ...tenant, inTransaction: true }, async () => {
        return await fn(tx);
      });
    }, options);
  };
}

const globalForPrisma = globalThis as unknown as { basePrisma?: PrismaClient; prismaAdmin?: PrismaClient };

/** Application role (`app_user`, no BYPASSRLS): the client used by every request. */
const basePrisma = globalForPrisma.basePrisma ?? createBaseClient();

/** Owner role: authentication (no tenant yet), migrations and admin jobs only. */
export const prismaAdmin =
  globalForPrisma.prismaAdmin
  ?? createBaseClient(process.env.DATABASE_ADMIN_URL ?? process.env.DIRECT_DATABASE_URL);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.prismaAdmin = prismaAdmin;
}

export const prisma = withTenantIsolation(basePrisma);
export const tenantTransaction = createTenantTransaction(basePrisma);
