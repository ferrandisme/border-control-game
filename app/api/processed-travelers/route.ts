import { NextResponse } from 'next/server';

import {
  FALLBACK_PROCESSED_TRAVELERS_ESTIMATE,
  getProcessedTravelersCount,
  incrementProcessedTravelersCount,
} from '@/lib/processed-travelers-counter';

export const runtime = 'nodejs';

export const GET = async () => {
  const total = await getProcessedTravelersCount();

  return NextResponse.json(
    {
      totalProcessedTravelers: total,
      fallbackEstimate: FALLBACK_PROCESSED_TRAVELERS_ESTIMATE,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
};

export const POST = async () => {
  const total = await incrementProcessedTravelersCount();

  return NextResponse.json(
    {
      totalProcessedTravelers: total,
      fallbackEstimate: FALLBACK_PROCESSED_TRAVELERS_ESTIMATE,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
};
