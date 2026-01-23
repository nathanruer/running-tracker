/**
 * Script to clean up orphaned test users from the database
 * Run with: npx tsx e2e/helpers/cleanup-orphans.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOrphanedTestUsers() {
  const orphanedUsers = await prisma.users.findMany({
    where: {
      email: {
        endsWith: '@running-tracker.com',
      },
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  if (orphanedUsers.length === 0) {
    console.log('No orphaned test users found.');
    return;
  }

  console.log(`Found ${orphanedUsers.length} orphaned test user(s):`);
  orphanedUsers.forEach((user) => {
    console.log(`  - ${user.email} (created: ${user.createdAt.toISOString()})`);
  });

  const result = await prisma.users.deleteMany({
    where: {
      email: {
        endsWith: '@running-tracker.com',
      },
    },
  });

  console.log(`\nDeleted ${result.count} test user(s).`);
}

cleanupOrphanedTestUsers()
  .catch((error) => {
    console.error('Error cleaning up test users:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
