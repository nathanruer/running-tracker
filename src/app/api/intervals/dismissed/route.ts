import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import { INTERVALS_SOURCE } from '@/server/services/intervals';
import {
  dismissSourceActivity,
  restoreSourceActivity,
} from '@/server/domain/sessions/dismissed-activities';

export const runtime = 'nodejs';

const dismissSchema = z.object({
  externalId: z.string().min(1),
  reason: z.string().max(200).nullable().optional(),
});

const restoreSchema = z.object({
  externalId: z.string().min(1),
});

/** Leaves an activity out of the import list — a duplicate, a walk, a recording started by mistake. */
export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    dismissSchema,
    async (data, userId) => {
      await dismissSourceActivity(userId, INTERVALS_SOURCE, data.externalId, data.reason);
      return NextResponse.json({ dismissed: true }, { status: HTTP_STATUS.CREATED });
    },
    { logContext: 'dismiss-intervals-activity' }
  );
}

export async function DELETE(request: NextRequest) {
  return handleApiRequest(
    request,
    restoreSchema,
    async (data, userId) => {
      await restoreSourceActivity(userId, INTERVALS_SOURCE, data.externalId);
      return NextResponse.json({ dismissed: false });
    },
    { logContext: 'restore-intervals-activity' }
  );
}
