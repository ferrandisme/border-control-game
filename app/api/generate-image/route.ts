import { NextResponse } from 'next/server';
import { z } from 'zod';

import { generatePortraitAsset } from '@/lib/media-service';
import { withRouteLogger } from '@/lib/route-logger';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  travelerName: z.string().min(1).max(100),
  nationality: z.string().min(1).max(60),
  demeanor: z.enum(['nervous', 'confident', 'friendly', 'evasive', 'aggressive']),
  purpose: z.string().min(1).max(120),
  backstory: z.string().min(1).max(500),
  gender: z.string().optional().default('unknown'),
  ageRange: z.string().optional().default('adult'),
});

export const POST = withRouteLogger(async (request) => {
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    request.log.error('Solicitud de imagen inválida.', { errors: parsed.error.format() });
    return NextResponse.json({ error: 'Solicitud de imagen inválida.' }, { status: 400 });
  }

  const portrait = await generatePortraitAsset({
    ...parsed.data,
    log: request.log,
  });

  return NextResponse.json(portrait, {
    headers: {
      'Cache-Control': 'no-store',
      'X-AI-Image-Provider': portrait.provider ?? 'disabled',
      'X-AI-Image-Model': portrait.model ?? 'disabled',
    },
  });
});
