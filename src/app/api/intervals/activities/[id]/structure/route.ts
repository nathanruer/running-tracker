import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from '@/server/services/api-handlers';
import { HTTP_STATUS } from '@/lib/constants';
import {
  getIntervalsApiKey,
  getIntervalsActivityIntervals,
  detectSessionStructure,
} from '@/server/services/intervals';

export const runtime = 'nodejs';

/** Session type and intervals detected on an activity, proposed in the import form before saving. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return handleGetRequest(
    request,
    async (userId) => {
      const apiKey = await getIntervalsApiKey(userId);
      if (!apiKey) {
        return NextResponse.json(
          { error: 'intervals.icu non configuré : connecte ton compte depuis Profil → Compte.' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const intervals = await getIntervalsActivityIntervals(apiKey, id);
      return NextResponse.json(detectSessionStructure(intervals));
    },
    { logContext: 'get-intervals-activity-structure' }
  );
}
