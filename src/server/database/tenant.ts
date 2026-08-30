import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  userId: string;
  /** Set while an interactive transaction already carries the tenant setting. */
  inTransaction?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Runs `fn` with every database access scoped to `userId` (row level security).
 * Prisma promises are lazy: they are awaited inside the context so the tenant hook sees it.
 */
export function runAsUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ userId }, async () => {
    return await fn();
  });
}

export function currentUserId(): string | null {
  return tenantStorage.getStore()?.userId ?? null;
}
