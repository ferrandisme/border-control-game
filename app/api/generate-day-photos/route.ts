import { NextResponse } from 'next/server';
import { z } from 'zod';

import { generateDayPassportPhotos } from '@/lib/media-service';
import { withRouteLogger } from '@/lib/route-logger';

export const runtime = 'nodejs';

const SlotPlanPhotoInputSchema = z.object({
  name: z.string().min(1).max(100),
  nationality: z.string().min(1).max(60),
  demeanor: z.enum(['nervous', 'confident', 'friendly', 'evasive', 'aggressive']),
  stated_purpose: z.string().min(1).max(120),
  backstory: z.string().min(1).max(500),
  gender: z.enum(['male', 'female']),
  age: z.number().int().min(18).max(95),
  visual_identity: z.object({
    age_range: z.string().min(1).max(60),
    nationality: z.string().min(1).max(60),
    demeanor: z.enum(['nervous', 'confident', 'friendly', 'evasive', 'aggressive']),
    gender: z.enum(['male', 'female']),
  }),
});

const RequestSchema = z.object({
  slots: z.array(SlotPlanPhotoInputSchema).length(6),
});

export const POST = withRouteLogger(async (request) => {
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    request.log.error('Solicitud de fotos de pasaporte inválida.', { errors: parsed.error.format() });
    return NextResponse.json({ error: 'Solicitud de fotos de pasaporte inválida.' }, { status: 400 });
  }

  try {
    const photos = await generateDayPassportPhotos({
      slots: parsed.data.slots,
      log: request.log,
    });

    request.log.info('[API] generate-day-photos returning:', { count: photos.length, withSpriteUrl: photos.filter(p => p.spriteUrl).length });

    return NextResponse.json({ photos }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    request.log.error('Error al generar fotos del día.', { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'No se pudieron generar las fotos del día.',
      },
      { status: 503 },
    );
  }
});
