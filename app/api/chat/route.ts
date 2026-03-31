import { NextResponse } from 'next/server';
import { z } from 'zod';

import { aiService } from '@/lib/ai-service';
import { withRouteLogger } from '@/lib/route-logger';

export const runtime = 'nodejs';

const ChatRequestSchema = z.object({
  systemPrompt: z.string().min(20),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(1000),
      }),
    )
    .min(1)
    .max(10),
});

export const POST = withRouteLogger(async (request) => {
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    request.log.error('Solicitud de chat inválida.', { errors: parsed.error.format() });
    return NextResponse.json({ error: 'Solicitud de chat inválida.' }, { status: 400 });
  }

  try {
    const result = await aiService.streamText({
      purpose: 'chat',
      system: parsed.data.systemPrompt,
      messages: parsed.data.messages,
      log: request.log,
    });

    const headers = new Headers(result.response.headers);
    headers.set('Cache-Control', 'no-store');

    return new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    });
  } catch (error) {
    request.log.error('Error en el chat de IA.', { error });
    return NextResponse.json(
      {
        error: 'Todos los proveedores fallaron al responder al chat.',
      },
      { status: 503 },
    );
  }
});
