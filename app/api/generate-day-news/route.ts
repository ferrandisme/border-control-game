import { NextResponse } from 'next/server';
import { z } from 'zod';

import { aiService } from '@/lib/ai-service';
import { withRouteLogger } from '@/lib/route-logger';
import { DayNewsSchema, DayResultSchema } from '@/schemas/day-content';

export const runtime = 'nodejs';

const RequestSchema = z.object({
  day: z.number().int().min(1),
  results: z.array(DayResultSchema).length(6),
});

export const POST = withRouteLogger(async (request) => {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = RequestSchema.safeParse(json);

  if (!parsed.success) {
    request.log.error('Solicitud inválida para generar la noticia del día.', { errors: parsed.error.format() });
    return NextResponse.json({ error: 'Solicitud inválida para generar la noticia del día.' }, { status: 400 });
  }

  const serializedResults = parsed.data.results
    .map((result, index) => {
      const crossedControl = result.player_decision === 'approve' ? 'sí' : 'no';
      return `${index + 1}. ${result.traveler_name} | culpable=${result.was_guilty ? 'sí' : 'no'} | pasó el control=${crossedControl}`;
    })
    .join('\n');

  try {
    const result = await aiService.generateObject({
      schema: DayNewsSchema,
      purpose: 'traveler',
      log: request.log,
      system: [
        'Eres un redactor de periódico digital serio.',
        'Escribe siempre en español.',
        'Devuelve exclusivamente JSON válido según el schema, sin markdown ni texto adicional.',
        'La noticia debe narrar un hecho realista ocurrido en el aeropuerto con tono sobrio y periodístico.',
      ].join(' '),
      prompt: [
        `Genera una noticia del cierre del día ${parsed.data.day} en el Aeropuerto Internacional Levante.`,
        'Debes basarte en UN caso concreto del listado, preferiblemente el más dramático: culpable que pasó o inocente rechazado. Si no existe, elige el caso más noticioso.',
        'No digas si la decisión del agente fue correcta o incorrecta. Limítate a narrar el hecho y si la persona superó o no el control.',
        'Incluye outlet, headline, subheadline, body y timestamp.',
        'El campo outlet debe ser exactamente: "Boletin de noticias".',
        'body debe tener exactamente 2 párrafos separados por una línea en blanco.',
        `Resultados reales del día:\n${serializedResults}`,
      ].join('\n\n'),
    });

    return NextResponse.json(
      { news: result.object },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-AI-Provider': result.providerUsed,
          'X-AI-Attempted-Providers': result.fallbackMetadata.attemptedProviders.join(','),
          'X-AI-Failed-Providers': result.fallbackMetadata.failedProviders.join(','),
        },
      },
    );
  } catch (error) {
    request.log.error('No se pudo generar la noticia del día.', { error });
    return NextResponse.json(
      {
        error: 'No se pudo generar la noticia del día.',
      },
      { status: 503 },
    );
  }
});
