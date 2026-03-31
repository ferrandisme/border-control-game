import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getFeatureFlags } from '@/lib/feature-flags';
import { withRouteLogger } from '@/lib/route-logger';
import { synthesizeTravelerSpeech } from '@/lib/audio-service';
import { GenderSchema } from '@/schemas/traveler';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  text: z.string().min(1).max(1000),
  demeanor: z.enum(['nervous', 'confident', 'friendly', 'evasive', 'aggressive']),
  gender: GenderSchema,
  voiceSeed: z.string().min(1),
});

export const POST = withRouteLogger(async (request) => {
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    request.log.error('Solicitud de audio inválida.', { errors: parsed.error.format() });
    return NextResponse.json({ error: 'Solicitud de audio inválida.' }, { status: 400 });
  }

  try {
    const speech = await synthesizeTravelerSpeech({
      ...parsed.data,
      log: request.log,
    });

    return NextResponse.json(speech, {
      headers: {
        'Cache-Control': 'no-store',
        'X-AI-Audio-Provider': speech.provider ?? 'disabled',
        'X-AI-Audio-Model': speech.model ?? 'disabled',
      },
      });
  } catch (error) {
    request.log.error('Error al generar audio.', { error });
    const flags = getFeatureFlags();

    return NextResponse.json(
      {
        status: 'error',
        audioUrl: null,
        provider: null,
        model: flags.audioModel,
        voiceId: null,
        sanitizedText: null,
      },
      { status: 503 },
    );
  }
});
