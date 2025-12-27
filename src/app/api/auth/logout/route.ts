import { NextRequest, NextResponse } from 'next/server';

import { clearSessionCookie } from '@/lib/auth';
import { handleApiRequest } from '@/lib/services/api-handlers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(
    request,
    null,
    async () => {
      await clearSessionCookie();
      return NextResponse.json({ success: true });
    },
    { requireAuth: false, logContext: 'logout' }
  );
}

